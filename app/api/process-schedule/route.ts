import { NextResponse } from 'next/server';
import axios from 'axios';
import { createEvents } from 'ics';
import { createServerSupabaseClient } from '../../../utils/supabase-server';

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

    // Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('schedules')
      .getPublicUrl(fileName);

    // Process image with AI model (using OpenRouter)
    const openRouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mixtral-8x7b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting class schedule information from images. Your task is to extract class names, times, and days from the schedule image and format them as structured JSON data. You must ONLY respond with valid JSON data in the specified format, with no additional text or explanation.

Required format:
{
  "classes": [
    {
      "name": "Class name",
      "days": ["Monday", "Wednesday"],
      "startTime": "09:00",
      "endTime": "10:30",
      "location": "Room number/building",
      "startDate": "2024-03-15",
      "endDate": "2024-05-15"
    }
  ]
}

Rules:
1. Days must be full names (Monday, Tuesday, etc.)
2. Times must be in 24-hour format (HH:MM)
3. Dates must be in YYYY-MM-DD format
4. All fields are required
5. Response must be valid JSON
6. Do not include any text outside the JSON structure`
          },
          {
            role: 'user',
            content: `Extract the class schedule information from this image: ${publicUrl}`
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent output
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
          'X-Title': 'Class Schedule Converter',
          'Content-Type': 'application/json'
        }
      }
    );

    const extractedContent = openRouterResponse.data.choices[0].message.content;
    
    // Try to clean up the response if it's not valid JSON
    const cleanedContent = extractedContent.trim().replace(/^```json\s*|\s*```$/g, '');
    
    let extractedData;
    try {
      extractedData = JSON.parse(cleanedContent);
      
      // Validate the structure
      if (!extractedData.classes || !Array.isArray(extractedData.classes)) {
        throw new Error('Invalid data structure: missing or invalid classes array');
      }
      
      // Validate each class
      extractedData.classes.forEach((classInfo: any, index: number) => {
        if (!classInfo.name || !classInfo.days || !classInfo.startTime || 
            !classInfo.endTime || !classInfo.location || !classInfo.startDate || 
            !classInfo.endDate) {
          throw new Error(`Missing required fields in class at index ${index}`);
        }
      });
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw AI response:', extractedContent);
      return NextResponse.json(
        { error: 'Failed to parse schedule data' },
        { status: 500 }
      );
    }
    
    // Generate calendar events
    const events = parseExtractedDataToEvents(extractedData);
    const { error: calendarError, value: calendarData } = createEvents(events);

    if (calendarError) {
      console.error('Error creating calendar events:', calendarError);
      return NextResponse.json(
        { error: 'Failed to create calendar events' },
        { status: 500 }
      );
    }

    // Store calendar data in Supabase
    const { data: calendarStore, error: calendarStoreError } = await supabase
      .from('calendars')
      .insert([
        {
          schedule_image: fileName,
          calendar_data: calendarData,
          extracted_data: extractedData
        }
      ])
      .select()
      .single();

    if (calendarStoreError) {
      console.error('Error storing calendar data:', calendarStoreError);
      return NextResponse.json(
        { error: 'Failed to store calendar data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      calendarUrl: `/api/calendar/${calendarStore.id}`,
      success: true
    });

  } catch (error) {
    console.error('Error processing schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function parseExtractedDataToEvents(extractedData: any) {
  try {
    return extractedData.classes.map((classInfo: any) => {
      // Parse dates
      const startDate = new Date(classInfo.startDate);
      const endDate = new Date(classInfo.endDate);
      
      // Parse times
      const [startHour, startMinute] = classInfo.startTime.split(':').map(Number);
      const [endHour, endMinute] = classInfo.endTime.split(':').map(Number);

      // Create event for each day of the week
      return classInfo.days.map((day: string) => {
        // Calculate first occurrence of this class
        const firstOccurrence = new Date(startDate);
        while (firstOccurrence.toLocaleDateString('en-US', { weekday: 'long' }) !== day) {
          firstOccurrence.setDate(firstOccurrence.getDate() + 1);
        }

        return {
          title: classInfo.name,
          description: `Class Location: ${classInfo.location}`,
          location: classInfo.location,
          start: [
            firstOccurrence.getFullYear(),
            firstOccurrence.getMonth() + 1,
            firstOccurrence.getDate(),
            startHour,
            startMinute
          ],
          end: [
            firstOccurrence.getFullYear(),
            firstOccurrence.getMonth() + 1,
            firstOccurrence.getDate(),
            endHour,
            endMinute
          ],
          recurrenceRule: `FREQ=WEEKLY;UNTIL=${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}T235959Z`
        };
      });
    }).flat();
  } catch (error) {
    console.error('Error parsing extracted data:', error);
    return [];
  }
} 