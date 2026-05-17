# NEHS - National Election Handling System

A secure, biometric-enabled national election platform designed for Ethiopia.

## Technology Stack Used in the Project

### Frontend
- **React.js**: Functional components and hooks for a dynamic UI.
- **HTML5 & CSS3**: Semantic structure and modern styling.
- **JavaScript (ES6+) / TypeScript**: Type-safe application logic.
- **Tailwind CSS**: Utility-first styling for a polished, distinctive interface.
- **Bootstrap / Material-UI**: Available for supplementary UI components.
- **Motion**: For smooth animations and route transitions.

### Backend
- **Node.js**: Scalable runtime environment.
- **Express.js**: Robust web framework for API development.
- **Socket.IO**: Real-time bidirectional communication for live election results.

### Database
- **MySQL**: Relational database for persistent storage of voters, users, and audit logs.
- **Drizzle ORM**: Type-safe database interactions.

### Authentication & Security
- **JWT (JSON Web Token)**: Secure role-based session management.
- **bcrypt**: Advanced password hashing for administrative accounts.
- **AES-256 Encryption**: Secure cryptographic anchoring of biometric templates.
- **HTTPS / TLS**: End-to-end encryption for data in transit.

### Biometric Handling
- **Fingerprint.js**: Client-side biometric simulation and device fingerprinting.
- **SHA-256 Hashing**: One-way cryptographic transformation of biometric data for privacy.

## Getting Started

### Admin & Staff Credentials
To access the administrative portal (Gateway) with different roles:
- **System Admin**: `admin` / `admin123`
- **Regional Admin**: `regional` / `admin123`
- **Registration Staff**: `staff` / `admin123`
- **Observer**: `observer` / `admin123`

### Features
- **Secure Voter Pre-Registration**: Citizens can initialize their identity on the national ledger.
- **Hierarchical RBAC**: Dedicated portals for Voters, Admins, Regional/District Staff, and Observers.
- **Anonymous Voting**: Utilizing Mix-nets concept to decouple identity from choice.
- **Real-Time Tallying**: Live reporting from across all regions via WebSockets.
- **Audit Logs**: Immutable record of all critical administrative actions.
