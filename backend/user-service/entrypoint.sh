#!/bin/sh

echo "⏳ Waiting for database..."
sleep 5

echo "🚀 Running Prisma generate..."
npx prisma generate

echo "📦 Running Prisma migrate..."
npx prisma migrate deploy

echo "✅ Starting User Service..."
npm start
