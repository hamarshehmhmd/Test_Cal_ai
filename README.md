# ClassCal - Schedule to Calendar Converter

ClassCal is a web application that converts class schedule screenshots into calendar events. It uses OCR (Optical Character Recognition) and AI to extract class information from images and generate calendar files compatible with Apple, Google, and Outlook calendars.

## 🚧 Project Status: Work in Progress

This project is currently under development and is not yet complete. Several features are still being implemented and tested.

### Current Features
- Upload schedule screenshots
- OCR text extraction using Tesseract.js
- AI-enhanced data extraction
- Basic pattern matching fallback
- Calendar file generation (ICS format)
- Support for multiple calendar formats
- Preview and edit extracted class information

### To Do
- [ ] Improve OCR accuracy for various schedule formats
- [ ] Enhance AI processing for better data extraction
- [ ] Add direct Google Calendar integration
- [ ] Implement user authentication
- [ ] Add schedule template support
- [ ] Create mobile-responsive design
- [ ] Add error handling for edge cases
- [ ] Implement comprehensive testing

## Technologies Used
- Next.js
- TypeScript
- Tesseract.js for OCR
- OpenRouter API for AI processing
- Supabase for storage
- Tailwind CSS for styling

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Add your API keys to `.env.local`:
   - OPENROUTER_API_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY

5. Start the development server:
   ```bash
   yarn dev
   ```

## Contributing

This project is currently in development. Feel free to open issues for bugs or feature requests.

## License

MIT License - See LICENSE file for details
