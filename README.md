Font Pairing Explorer
An intelligent font pairing application that helps designers discover and preview perfect font combinations for their projects. Powered by Google Fonts API.

Features
Intelligent font pairing algorithm based on typography principles
Dynamic loading of Google Fonts
Live preview of font combinations
Adjustable contrast levels between heading and body fonts
Color customization with advanced color picker
Downloadable font pairs directly from Google Fonts
Light/dark mode support
Setup
Clone the repository

git clone https://github.com/your-username/font-pairing-app.git
cd font-pairing-app
Install dependencies

npm install
Create a .env.local file in the root directory with your Google Fonts API key:

GOOGLE_FONTS_API_KEY=your_google_fonts_api_key
You can get a Google Fonts API key from the Google Cloud Console.

Start the development server

npm run dev
Open http://localhost:3000 in your browser

Building for Production
npm run build
npm start
Environment Variables
Variable	Description	Required
GOOGLE_FONTS_API_KEY	Your Google Fonts API key	Yes
License
MIT
