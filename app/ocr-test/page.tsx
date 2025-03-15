
'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'react-hot-toast';

export default function OcrTestPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    try {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setResult(null);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      toast.success('Processing image with OCR... Please wait');
      
      // Send to OCR endpoint
      const response = await fetch('/api/extract-schedule', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }
      
      // Display raw text
      if (data.rawExtractedText) {
        setResult(data.rawExtractedText);
        toast.success('OCR completed successfully!');
      } else {
        toast.error('No text was extracted');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <Toaster position="bottom-center" />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">OCR Test Page</h1>
        
        <div className="mb-6">
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:bg-gray-50"
          >
            <input {...getInputProps()} />
            <p className="mb-2 font-medium">Drop an image here or click to select</p>
            <p className="text-sm text-gray-500">This will process the image with Tesseract OCR</p>
            
            {isProcessing && (
              <div className="mt-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Processing... (may take 15-30 seconds)</p>
              </div>
            )}
          </div>
        </div>
        
        {imagePreview && (
          <div className="mb-6 flex justify-center">
            <img
              src={imagePreview}
              alt="Uploaded image"
              className="max-h-64 rounded-md shadow-md"
            />
          </div>
        )}
        
        {result && (
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-xl font-medium mb-2">OCR Result:</h2>
            <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap font-mono text-sm overflow-auto max-h-96">
              {result}
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <a href="/" className="text-blue-500 hover:underline">Back to main app</a>
        </div>
      </div>
    </div>
  );
} 