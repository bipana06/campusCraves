# CampusCraves

CampusCraves is a platform designed to facilitate food sharing within a campus community. Users can post, reserve, and complete transactions for food items, promoting sustainability and reducing food waste.

## Features

- **Post Food**: Users can create posts for food items, including details like name, quantity, category, dietary info, pickup location, and time.
- **Reserve Food**: Users can reserve available food items.
- **Complete Transactions**: Reserved food items can be marked as completed once the transaction is done.
- **Image Upload**: Users can upload images of food items.
- **Expiration Tracking**: Posts include expiration times to ensure food safety.

## Technologies Used

### Frontend
- **React Native**: For building the mobile application.
- **Expo**: For development and testing.
- **React Native Image Picker**: For image selection.

### Backend
- **FastAPI**: For building the RESTful API.
- **MongoDB**: For storing food posts and user data.
- **Pydantic**: For data validation.

## Installation

### Prerequisites
- Node.js and npm
- Python 3.12 or higher
- MongoDB
- Expo CLI

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd CC-backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv campusenv
   source campusenv/bin/activate  # On Windows: campusenv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## API Endpoints

### Food Posts
- **POST** `/api/food`: Create a new food post.
- **GET** `/api/food`: Retrieve all food posts.
- **POST** `/api/food/reserve`: Reserve a food item.
- **POST** `/api/food/complete`: Mark a food transaction as complete.

## Contributing

Contributors:
- Aabaran Paudel
- Bipana Bastola
- Komal Neupane
- Manoj Dhakal

### Guidelines
1. Create a new branch for your feature or bug fix.
2. Use `pip freeze > requirements.txt` before pushing if you install new Python packages.
3. Submit a pull request for review.

## License

This project is licensed under the MIT License.

## Acknowledgments

Special thanks to the contributors and the campus community for their support in making this project a reality.

