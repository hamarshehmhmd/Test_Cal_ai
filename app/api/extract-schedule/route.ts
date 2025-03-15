import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../utils/supabase-server';
import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js/src/worker';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';

// Fallback data for any issues
const FALLBACK_DATA = {
  classes: [
    {
      name: "Introduction to Computer Science",
      professor: "Dr. Jane Smith",
      days: ["Monday", "Wednesday"],
      startTime: "10:00",
      endTime: "11:30",
      location: "Science Building 101",
      startDate: "2024-03-15",
      endDate: "2024-06-15"
    },
    {
      name: "Calculus II",
      professor: "Dr. John Wilson",
      days: ["Tuesday", "Thursday"],
      startTime: "13:00",
      endTime: "14:30",
      location: "Math Hall 305",
      startDate: "2024-03-15",
      endDate: "2024-06-15"
    }
  ]
};

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Upload file to Supabase Storage
    const buffer = await file.arrayBuffer();
    const fileName = `schedules/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('schedules')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    console.log('File uploaded successfully to:', fileName);

    // Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('schedules')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);
    
    // Create a signed URL that will work more reliably
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('schedules')
      .createSignedUrl(fileName, 60 * 60); // 1 hour expiry
      
    let imageUrl = publicUrl;
    
    if (signedUrlData && !signedUrlError) {
      console.log('Created signed URL with 1 hour expiry:', signedUrlData.signedUrl);
      imageUrl = signedUrlData.signedUrl;
    } else if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
    }

    let extractedText = '';
    let aiProcessedData = null;

    try {
      // Save buffer to temporary file for Tesseract processing
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${file.name}`);
      
      // Convert ArrayBuffer to Buffer and write to temp file
      fs.writeFileSync(tempFilePath, Buffer.from(buffer));
      
      console.log('Starting Tesseract OCR processing...');
      
      try {
        // Initialize Tesseract worker with proper configuration
        const worker = await createWorker();
        
        // Configure worker paths
        await (worker as any).loadLanguage('eng');
        await (worker as any).initialize('eng');
        
        // Set parameters for better text recognition
        await (worker as any).setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:.-() ',
          preserve_interword_spaces: '1',
        });

        // Perform OCR on the image
        const { data: { text } } = await (worker as any).recognize(tempFilePath);
        extractedText = text;

        // Terminate worker after use
        await worker.terminate();
        
        console.log('OCR extraction complete. Text length:', extractedText.length);
        console.log('Sample of extracted text:', extractedText.substring(0, 200) + '...');
      } catch (tesseractError: unknown) {
        console.error('Tesseract OCR error:', tesseractError);
        return NextResponse.json(
          { 
            error: 'Failed to process image with OCR', 
            details: tesseractError instanceof Error ? tesseractError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      
      // Use enhanced AI processing for better extraction
      let result = null;
      try {
        result = await enhanceWithAI(extractedText);
      } catch (aiError) {
        console.error('Error calling AI service:', aiError);
      }

      // If AI fails, try basic pattern matching
      if (!result) {
        result = processExtractedText(extractedText);
      }

      // If all extraction attempts fail, return error
      if (!result) {
        return NextResponse.json(
          { error: 'Failed to extract schedule data from image' },
          { status: 422 }
        );
      }

      return NextResponse.json({ 
        extractedData: result,
        isExtracted: true,
        imageUrl: publicUrl,
        publicUrl,
        signedUrl: signedUrlData?.signedUrl || null,
        processedBy: result === processExtractedText(extractedText) ? 'basic' : 'ai',
        rawExtractedText: extractedText // Include raw OCR text for debugging
      });
      
    } catch (ocrError: any) {
      console.error('Error in OCR extraction process:', ocrError);
      return NextResponse.json(
        { error: 'Failed to process image', details: ocrError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Helper function to enhance OCR text with AI
async function enhanceWithAI(ocrText: string): Promise<{ classes: any[] } | null> {
  try {
    // Check if OpenRouter API key is available
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.log('No OpenRouter API key found, using simulated AI enhancement');
      // If no API key, use a simulated enhancement
      return simulateAIEnhancement(ocrText);
    }
    
    // Using OpenRouter API to process the OCR text - with a free model
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "google/gemma-7b-it", // A free model on OpenRouter
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in extracting structured class schedule information from OCR text. Your task is to parse the text and extract all class details in a clean, structured format.'
          },
          {
            role: 'user',
            content: `I have OCR text from a class schedule image. Please extract all class information from this text and format it as a JSON object with the following structure for each class:
            {
              "name": "Class name",
              "professor": "Professor name",
              "days": ["Monday", "Wednesday"], // Array of days the class meets
              "startTime": "09:00", // 24-hour format
              "endTime": "10:30", // 24-hour format
              "location": "Room number/building",
              "startDate": "2024-03-15", // YYYY-MM-DD format
              "endDate": "2024-05-15" // YYYY-MM-DD format
            }
            
            The OCR text is as follows:
            ${ocrText}
            
            Rules for extraction:
            1. If the professor name is not explicitly mentioned, use "Unknown"
            2. Use full day names (Monday, Tuesday, etc.)
            3. Use 24-hour format for times (HH:MM)
            4. If exact dates aren't mentioned, use sensible defaults for a typical semester
            5. Make educated guesses when information is partially visible or unclear
            6. The response should be ONLY a valid JSON object with a "classes" array containing all extracted class objects`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Class Schedule Converter'
        }
      }
    );
    
    // Extract the JSON from the AI response
    const aiResponse = response.data.choices[0].message.content;
    try {
      // Try to parse the AI response as JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        
        // Validate the structure
        if (jsonData && jsonData.classes && Array.isArray(jsonData.classes) && jsonData.classes.length > 0) {
          return jsonData;
        }
      }
      throw new Error('Invalid JSON format in AI response');
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('AI response:', aiResponse);
      return null;
    }
  } catch (error) {
    console.error('AI enhancement error:', error);
    return null;
  }
}

// Simple simulation of AI enhancement when API key is not available
function simulateAIEnhancement(ocrText: string): { classes: any[] } | null {
  console.log('Using simulated AI enhancement for OCR text');
  
  // Let's try to do some smarter extraction based on patterns in the OCR text
  try {
    const classes: any[] = [];
    
    // Default date range
    const defaultStartDate = "2024-03-01";
    const defaultEndDate = "2024-07-01";
    
    // Extract class sections from text
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced regex patterns for different schedule formats
    const classCodePattern = /\(([A-Za-z0-9-]+)\)/; // For course codes like (CS101)
    const timePattern = /(\d{1,2}[\.:]\d{2})[\s-]*(\d{1,2}[\.:]\d{2})/; // For times like 10:30-12:00
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi;
    const professorPattern = /(?:with|instructor|prof\.?|professor)[\s:]*([^,\n()]+)/i;
    const locationPattern = /(?:in|room|location|bldg\.?|building)[\s:]*([^,\n()]+)/i;
    
    let currentDays: string[] = [];
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a header for days
      const headerDayMatches = line.match(dayPattern);
      if (headerDayMatches && (line.toLowerCase().includes('class') || line.toLowerCase().includes('day'))) {
        currentDays = headerDayMatches.map(day => day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
        currentSection = line;
        continue;
      }
      
      // Check if this line contains a class entry (has time or course code)
      if (timePattern.test(line) || classCodePattern.test(line) || line.includes(':')) {
        // Create a new class object
        const classInfo: any = {
          name: "Unknown Class",
          professor: "Unknown",
          days: [...currentDays],
          startTime: "",
          endTime: "",
          location: "Classroom",
          startDate: defaultStartDate,
          endDate: defaultEndDate
        };
        
        // Extract class name - prefer before colon or parenthesis
        if (line.includes(':')) {
          classInfo.name = line.split(':')[0].trim().split('(')[0].trim();
        } else if (line.includes('(')) {
          classInfo.name = line.split('(')[0].trim();
        }
        
        // Clean up class name if it's too long
        if (classInfo.name.length > 50) {
          classInfo.name = classInfo.name.substring(0, 50) + '...';
        }
        
        // Extract course code if available
        const codeMatch = line.match(classCodePattern);
        if (codeMatch) {
          classInfo.courseCode = codeMatch[1];
        }
        
        // Extract time
        const timeMatch = line.match(timePattern);
        if (timeMatch) {
          classInfo.startTime = timeMatch[1].replace('.', ':');
          classInfo.endTime = timeMatch[2].replace('.', ':');
        }
        
        // Extract professor
        const profMatch = line.match(professorPattern) || 
                         (i + 1 < lines.length && lines[i + 1].match(professorPattern));
        if (profMatch) {
          classInfo.professor = profMatch[1].trim();
        }
        
        // Extract location
        const locMatch = line.match(locationPattern) || 
                        (i + 1 < lines.length && lines[i + 1].match(locationPattern));
        if (locMatch) {
          classInfo.location = locMatch[1].trim();
        }
        
        // Extract days if not set from header
        if (classInfo.days.length === 0) {
          const dayMatches = line.match(dayPattern);
          if (dayMatches) {
            classInfo.days = dayMatches.map(day => day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
          }
        }
        
        // Only add classes that have at least some basic information
        if (classInfo.name !== "Unknown Class" || classInfo.startTime) {
          classes.push(classInfo);
        }
      }
    }
    
    // Only return if we found some classes
    if (classes.length > 0) {
      return { classes };
    }
    
    return null;
  } catch (error) {
    console.error('Error in simulated AI enhancement:', error);
    return null;
  }
}

// Helper function to parse the extracted text into structured class data
function processExtractedText(text: string): { classes: any[] } | null {
  try {
    // Initialize the classes array
    const classes: any[] = [];
    
    // Example parsing logic (can be enhanced for better accuracy)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let currentDays: string[] = [];
    let classInfo: any = {};
    
    // Default date range for the semester (adjust as needed)
    const defaultStartDate = "2024-03-01";
    const defaultEndDate = "2024-07-01";
    
    for (const line of lines) {
      // Skip header lines or day indicators
      if (line.toLowerCase().includes('schedule') || line.toLowerCase().includes('classes:')) {
        // Extract days if they're in the header (e.g., "Sunday & Tuesday Classes:")
        const dayMatch = line.match(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/gi);
        if (dayMatch) {
          currentDays = dayMatch.map(day => day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
        }
        continue;
      }
      
      // Check if this line contains a class (using more flexible patterns for OCR)
      if (line.includes(':')) {
        // Reset class info for new class entry
        classInfo = {
          name: "",
          professor: "Unknown",
          days: [...currentDays],
          startTime: "",
          endTime: "",
          location: "Classroom",
          startDate: defaultStartDate,
          endDate: defaultEndDate
        };
        
        // Extract class name
        const nameParts = line.split(':')[0].trim();
        classInfo.name = nameParts.split('(')[0].trim();
        
        // Extract times - allow for OCR errors in time format
        const timeMatch = line.match(/(\d{1,2}[\.:]\d{2})[\s-]+(\d{1,2}[\.:]\d{2})/);
        if (timeMatch) {
          // Normalize time format (replace . with : if needed)
          classInfo.startTime = timeMatch[1].replace('.', ':');
          classInfo.endTime = timeMatch[2].replace('.', ':');
        }
        
        // Extract professor
        if (line.toLowerCase().includes('with')) {
          const professorMatch = line.match(/with\s+([^in]+)/i);
          if (professorMatch) {
            classInfo.professor = professorMatch[1].trim();
          }
        }
        
        // Extract location
        if (line.toLowerCase().includes('room') || line.includes('in ')) {
          const locationMatch = line.match(/in\s+([^with]+)/i);
          if (locationMatch) {
            classInfo.location = locationMatch[1].trim();
          } else if (line.toLowerCase().includes('room')) {
            const roomMatch = line.match(/room\s+([^\s,]+)/i);
            if (roomMatch) {
              classInfo.location = `Room ${roomMatch[1]}`;
            }
          }
        }
        
        // Add the class to our array
        classes.push(classInfo);
      }
      
      // Check for day-specific classes (more flexible for OCR)
      const dayOnlyMatch = line.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+Only\s*:/i);
      if (dayOnlyMatch) {
        currentDays = [dayOnlyMatch[1].charAt(0).toUpperCase() + dayOnlyMatch[1].slice(1).toLowerCase()];
        continue;
      }
      
      // Check for multi-day classes (more flexible for OCR)
      const dayMatch = line.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)(\s*[&\+]\s*(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday))?\s+Classes\s*:/i);
      if (dayMatch) {
        currentDays = [];
        if (dayMatch[1]) currentDays.push(dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase());
        if (dayMatch[3]) currentDays.push(dayMatch[3].charAt(0).toUpperCase() + dayMatch[3].slice(1).toLowerCase());
        continue;
      }
      
      // Check for single day headers (e.g., "Monday:")
      const singleDayMatch = line.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*:/i);
      if (singleDayMatch) {
        currentDays = [singleDayMatch[1].charAt(0).toUpperCase() + singleDayMatch[1].slice(1).toLowerCase()];
        continue;
      }
    }
    
    // Check if we got any classes
    if (classes.length === 0) {
      console.log('No classes extracted from text');
      return null;
    }
    
    // Log the extracted classes for debugging
    console.log(`Successfully extracted ${classes.length} classes`);
    
    return { classes };
  } catch (error) {
    console.error('Error processing extracted text:', error);
    return null;
  }
} 