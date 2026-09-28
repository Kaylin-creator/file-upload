# Project: Upload File System

## Stack
Next.js (App Router, TypeScript), deployed on Vercel. Supabase (Postgres + Auth). Amazon S3 for file blobs. Architecture is a monolith: frontend and API routes live in one Next.js app.

## Data model
- users: userId (UUID, PK), email
- files: documentId (PK), userId (UUID, FK -> users), s3Url (text)
- One user has many files. A file belongs to exactly one user.

## Upload rules
- The user uploads a file from their local device only (no URL imports, no cloud drives).
- The frontend sends a synchronous request to the API.
- The API uploads the file to S3 synchronously, THEN stores the document details in the database.
- Never trust the client for userId. Always derive it from the authenticated session on the server.

## Conventions
- TypeScript strict mode. Validate all inputs with zod.
- Secrets only via environment variables; never commit them. Keep .env.example up to date.
- Small modules: lib/ for infrastructure clients, app/api/ for route handlers, components/ for UI.
- Every route returns JSON in the shape { data } or { error: { code, message } } with correct HTTP status codes.
