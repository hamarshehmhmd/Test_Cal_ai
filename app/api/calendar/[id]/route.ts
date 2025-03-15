import { NextResponse } from 'next/server';

// Access the global calendar cache
declare global {
  var calendarCache: Map<string, any>;
}

// Initialize the global cache if it doesn't exist yet
// This needs to be in global scope to persist between API route invocations
global.calendarCache = global.calendarCache || new Map();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    console.log(`Serving calendar ${id} in format: ${format || 'ics'}`);
    
    // Get calendar data from cache
    const calendarData = global.calendarCache.get(id);
    
    if (!calendarData) {
      console.error(`Calendar with ID ${id} not found in cache`);
      return NextResponse.json(
        { error: 'Calendar not found' },
        { status: 404 }
      );
    }
    
    // If format is Google Calendar, redirect to Google Calendar
    if (format === 'google') {
      // Convert ICS data to Google Calendar URL
      const googleUrl = createGoogleCalendarUrl(calendarData.calendarData);
      return NextResponse.redirect(googleUrl);
    }
    
    // Otherwise, return ICS file
    return new NextResponse(calendarData.calendarData, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="class-schedule.ics"`,
      },
    });
  } catch (error) {
    console.error('Error serving calendar:', error);
    return NextResponse.json(
      { error: 'Failed to serve calendar' },
      { status: 500 }
    );
  }
}

// Function to create Google Calendar URL
function createGoogleCalendarUrl(icsData: string): string {
  // Basic URL for Google Calendar import
  const baseUrl = 'https://www.google.com/calendar/render?cid=';
  
  // Data URL approach - encode the ICS data as a data URL
  const encodedIcs = encodeURIComponent(
    `data:text/calendar;charset=utf8,${icsData}`
  );
  
  return `${baseUrl}${encodedIcs}`;
} 