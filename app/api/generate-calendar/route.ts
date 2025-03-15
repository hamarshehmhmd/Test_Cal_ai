import { NextResponse } from 'next/server';
import { createEvents } from 'ics';

// Access the global calendar cache
declare global {
  var calendarCache: Map<string, any>;
}

// Initialize the global cache if it doesn't exist yet
global.calendarCache = global.calendarCache || new Map();

export async function POST(request: Request) {
  try {
    const { extractedData, format } = await request.json();
    
    if (!extractedData || !extractedData.classes) {
      return NextResponse.json(
        { error: 'No schedule data provided' },
        { status: 400 }
      );
    }

    console.log(`Generating ${format} calendar for ${extractedData.classes.length} classes`);

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

    // Generate a unique ID for the calendar without storing in database
    const calendarId = generateUniqueId();
    
    // Store the calendar data in memory (this will be lost on server restart)
    // In a production app, you'd store this in Redis or another fast cache
    global.calendarCache.set(calendarId, {
      calendarData,
      format,
      timestamp: Date.now()
    });

    // Clean up old entries from the cache
    cleanupCalendarCache();

    // Return URL based on format
    let calendarUrl = `/api/calendar/${calendarId}`;
    
    if (format) {
      calendarUrl += `?format=${format}`;
    }

    console.log(`Successfully generated calendar with ID: ${calendarId}`);
    
    return NextResponse.json({
      calendarUrl,
      success: true
    });

  } catch (error) {
    console.error('Error generating calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate a unique ID for the calendar
function generateUniqueId() {
  return `cal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Clean up old entries from the calendar cache (older than 1 hour)
function cleanupCalendarCache() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  // Convert Map entries to Array before iteration to fix TypeScript error
  Array.from(global.calendarCache.entries()).forEach(([id, data]) => {
    if (now - data.timestamp > ONE_HOUR) {
      global.calendarCache.delete(id);
    }
  });
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

        // Create description with professor info
        const professorInfo = classInfo.professor && classInfo.professor !== 'N/A' 
          ? `Professor: ${classInfo.professor}\n` 
          : '';
        
        const description = `${professorInfo}Class Location: ${classInfo.location}`;

        return {
          title: classInfo.name,
          description: description,
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