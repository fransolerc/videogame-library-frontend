# Videogame Library Frontend

A modern and responsive web application for browsing and discovering video games. This project, built with Angular, allows users to explore game libraries, search for specific titles, and view detailed information.

## ✨ Main Features

*   **Game Discovery:** View lists of the latest releases and top-rated games.
*   **Advanced Search:** A powerful search bar to find any game in the library, with live results.
*   **Dynamic Filtering:** Sort and filter results by platform, release date, name, and rating.
*   **Responsive Design:** A clean and adaptive UI that works on both desktop and mobile devices.
*   **Component-Based Architecture:** Built with reusable and modular Angular components.

## 📂 Project Structure

The project follows a standard Angular structure, with key logic organized as follows:

*   `src/app/core`: Contains core services (like `GameService`, `AuthService`) that are central to the application.
*   `src/app/shared`: Holds shared models and utilities used across different features.
*   `src/app/home`: The main page of the application, which displays game lists and the search functionality.
*   `src/app/game-card-horizontal`: A compact, responsive component used in lists and search results to display key game information efficiently.
*   `src/app/game-detail-modal`: A modal component to show detailed information about a selected game.

## 🚀 Development

This project was generated using [Angular CLI](https://github.com/angular/angular-cli).

### Development server

To start a local development server, run:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding

To generate a new component, run:

```bash
ng generate component component-name
```

You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Building

To build the project for production, run:

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

### Running unit tests

To execute the unit tests via [Vitest](https.vitest.dev/), run:

```bash
ng test
```
