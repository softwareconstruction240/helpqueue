FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    sqlite3 \
    libsqlite3-dev

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd
RUN docker-php-ext-install pdo_sqlite

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Create directory for SQLite database and set permissions
RUN mkdir -p /var/www/queuedb && \
    touch /var/www/queuedb/database.sqlite && \
    chown -R www-data:www-data /var/www/queuedb && \
    chmod 777 /var/www/queuedb && \
    chmod 666 /var/www/queuedb/database.sqlite

# Set working directory
WORKDIR /var/www/html
