#!/bin/sh
set -e

echo "Corriendo migraciones..."
npx prisma migrate deploy

echo "Iniciando servidor..."
exec node dist/main
