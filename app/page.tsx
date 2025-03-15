'use client';

import { Toaster } from 'react-hot-toast';
import UploadButton from './components/UploadButton';

export default function Home() {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-3xl">📅</span>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  ClassCal
                </h1>
              </div>
              <a
                href="https://github.com/yourusername/classcal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Schedule to Calendar Converter</h2>
              <p className="text-lg mb-2">
                Transform your class schedule screenshots into calendar events instantly
              </p>
              <p className="text-sm text-gray-500">
                Supports Apple, Google, and Outlook calendars
              </p>
            </div>
            
            <div className="mt-8">
              <UploadButton />
            </div>

            <div className="mt-16">
              <h3 className="text-xl font-semibold mb-6 text-center">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-card p-6 rounded-lg shadow-card">
                  <div className="text-3xl mb-4 text-primary">1</div>
                  <h4 className="font-medium mb-2">Upload Your Schedule</h4>
                  <p className="text-sm">
                    Take a screenshot of your class schedule and upload it
                  </p>
                </div>
                <div className="bg-card p-6 rounded-lg shadow-card">
                  <div className="text-3xl mb-4 text-primary">2</div>
                  <h4 className="font-medium mb-2">Review the Details</h4>
                  <p className="text-sm">
                    Verify the extracted class information and select your calendar format
                  </p>
                </div>
                <div className="bg-card p-6 rounded-lg shadow-card">
                  <div className="text-3xl mb-4 text-primary">3</div>
                  <h4 className="font-medium mb-2">Download Your Calendar</h4>
                  <p className="text-sm">
                    Get your calendar file or add events directly to Google Calendar
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6">
          <div className="container mx-auto px-4">
            <div className="text-center text-sm text-gray-500">
              <p>© 2024 ClassCal. All rights reserved.</p>
              <p className="mt-1">Powered by AI ✨</p>
              <div className="mt-3 flex justify-center gap-4">
                <a href="/ocr-test" className="text-primary hover:underline text-xs">
                  OCR Testing Page
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <Toaster position="bottom-center" />
    </>
  );
}
