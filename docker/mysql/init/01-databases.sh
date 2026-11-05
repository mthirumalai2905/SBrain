#!/bin/bash
# Runs once, on the first start of an empty MySQL volume.
# Creates the "brain" and "directus" databases and gives the app user access
# to both. Credentials come from the container environment, not this file.
set -euo pipefail

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${BRAIN_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`${DIRECTUS_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${BRAIN_DB_NAME}\`.* TO '${MYSQL_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${DIRECTUS_DB_NAME}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
