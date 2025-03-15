'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import Spinner from './Spinner';
import SchedulePreview from './SchedulePreview';

interface ClassInfo {
  name: string;
  professor: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  startDate: string;
  endDate: string;
}

export default function UploadButton() {
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<{ classes: ClassInfo[] } | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<'ai' | 'basic' | 'fallback' | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsUploading(true);
      setImageError(false);
      setRawOcrText(null);
      setShowRawText(false);
      setProcessingMethod(null);
      const file = acceptedFiles[0];
      
      if (!file) {
        toast.error('Please select an image file');
        return;
      }

      console.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size);
      toast.success('Processing your schedule with OCR... This may take 15-30 seconds');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-schedule', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      // Store raw response for debugging
      setDebugInfo(data);

      // Store raw OCR text for debugging
      if (data.rawExtractedText) {
        setRawOcrText(data.rawExtractedText);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process schedule');
      }

      // Set processing method
      setProcessingMethod(data.processedBy || 'fallback');
      
      // Check if we're using fallback data
      if (data.isExtracted === false) {
        setUsingFallbackData(true);
        toast.error('We had trouble reading your schedule. Sample data has been provided.');
      } else {
        setUsingFallbackData(false);
        
        if (data.processedBy === 'ai') {
          toast.success(`AI successfully extracted ${data.extractedData?.classes?.length || 0} classes!`);
        } else if (data.processedBy === 'basic') {
          toast.success(`Basic processing extracted ${data.extractedData?.classes?.length || 0} classes.`);
        } else {
          toast.success(`Successfully extracted ${data.extractedData?.classes?.length || 0} classes!`);
        }
      }

      setExtractedData(data.extractedData);
      
      // Prefer signed URL if available, fallback to regular URL
      const imageUrl = data.signedUrl || data.imageUrl || data.publicUrl || null;
      
      // Store image URL if available
      if (imageUrl) {
        console.log('Using image URL:', imageUrl);
        setUploadedImageUrl(imageUrl);
      } else {
        console.warn('No image URL received from API');
        setImageError(true);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process schedule. Please try again.');
      setImageError(true);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleConfirm = async (format: string, updatedClasses: ClassInfo[]) => {
    try {
      setIsUploading(true);
      
      // Use the updated classes from the SchedulePreview component
      const dataToSend = {
        extractedData: { classes: updatedClasses },
        format
      };
      
      const response = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate calendar');
      }

      // Download or redirect based on format
      if (format === 'google') {
        window.open(data.calendarUrl, '_blank');
      } else {
        window.location.href = data.calendarUrl;
      }
      
      const successMessage = usingFallbackData 
        ? 'Calendar generated successfully with edited data!' 
        : 'Calendar generated successfully!';
      
      toast.success(successMessage);
      setExtractedData(null);
      setUsingFallbackData(false);
      setUploadedImageUrl(null);
      setProcessingMethod(null);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate calendar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
    setUsingFallbackData(false);
    setUploadedImageUrl(null);
    setProcessingMethod(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: isUploading || !!extractedData,
  });

  const getProcessingMethodDisplay = () => {
    switch(processingMethod) {
      case 'ai':
        return (
          <div className="p-4 bg-green-50 text-green-800 rounded-md border border-green-200">
            <h4 className="font-medium">AI-Enhanced Extraction</h4>
            <p className="text-sm mt-1">
              We used OpenRouter AI to enhance the OCR results, providing more accurate extraction.
            </p>
          </div>
        );
      case 'basic':
        return (
          <div className="p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
            <h4 className="font-medium">Basic Text Processing</h4>
            <p className="text-sm mt-1">
              We used pattern recognition to extract class information from the OCR text.
            </p>
          </div>
        );
      case 'fallback':
        return (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
            <h4 className="font-medium">We couldn't fully extract your schedule</h4>
            <p className="text-sm mt-1">
              We've provided sample data below that you can edit. You can adjust any details before generating your calendar.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (extractedData) {
    return (
      <div className="space-y-6">
        {getProcessingMethodDisplay()}

        {rawOcrText && (
          <div className="mt-2">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="text-xs underline text-blue-600"
            >
              {showRawText ? 'Hide OCR Text' : 'Show Raw OCR Text'}
            </button>
            {showRawText && (
              <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs text-gray-700 max-h-64 overflow-y-auto font-mono">
                <pre className="whitespace-pre-wrap">{rawOcrText}</pre>
              </div>
            )}
          </div>
        )}

        {uploadedImageUrl && (
          <div className="flex flex-col items-center">
            <div className="relative max-w-md">
              <img 
                src={uploadedImageUrl} 
                alt="Uploaded schedule" 
                className="max-h-80 w-auto object-contain rounded-md shadow-md border border-gray-200" 
                onError={(e) => {
                  console.error('Error loading image:', uploadedImageUrl);
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/placeholder-image.svg';
                  toast.error('Failed to load the uploaded image');
                  setImageError(true);
                }}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Uploaded schedule image
              </p>
            </div>
            
            {imageError && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-red-600">
                  There was an issue displaying your image, but we've still processed your schedule data.
                </p>
                
                <div className="flex space-x-2">
                  {/* Try each URL option */}
                  {debugInfo?.signedUrl && (
                    <a 
                      href={debugInfo.signedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      View Signed URL
                    </a>
                  )}
                  
                  {debugInfo?.publicUrl && (
                    <a 
                      href={debugInfo.publicUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-100 text-green-600 text-xs rounded hover:bg-green-200"
                    >
                      View Public URL
                    </a>
                  )}
                  
                  <button
                    onClick={() => {
                      console.log('Debug info:', debugInfo);
                      toast.success('Debug info logged to console');
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                  >
                    Debug Console
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <SchedulePreview
          classes={extractedData.classes}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragActive ? 'border-primary bg-primary bg-opacity-5' : 'border-border hover:bg-accent'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="bg-accent rounded-full p-4 w-16 h-16 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-primary" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium">Drag & drop your schedule image here</p>
          <p className="text-sm text-gray-500 mt-1">or click to browse files</p>
        </div>
        <div className="text-sm text-gray-500 max-w-md">
          <p>For best results, ensure your schedule image is:</p>
          <ul className="mt-1 list-disc list-inside">
            <li>Clear and not blurry</li>
            <li>Shows complete class information</li>
            <li>Has good contrast between text and background</li>
          </ul>
        </div>
        <button
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUploading}
        >
          {isUploading && <Spinner />}
          {isUploading ? 'Processing...' : 'Upload Schedule'}
        </button>
      </div>
    </div>
  );
} 