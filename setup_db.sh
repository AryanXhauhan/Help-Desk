#!/bin/bash
service postgresql start
service redis-server start

# Configure postgres to allow password auth from localhost
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/18/main/postgresql.conf 2>/dev/null || true
echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/18/main/pg_hba.conf
echo "host all all 127.0.0.1/32 md5" >> /etc/postgresql/18/main/pg_hba.conf
echo "host all all ::1/128 md5" >> /etc/postgresql/18/main/pg_hba.conf
service postgresql reload

su - postgres << 'EOF'
psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'helpdesk') THEN CREATE ROLE helpdesk WITH LOGIN PASSWORD 'helpdesk_secret' SUPERUSER; END IF; END \$\$;"
psql -c "SELECT 'CREATE DATABASE helpdesk_db OWNER helpdesk' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'helpdesk_db')\gexec"
psql -c "GRANT ALL PRIVILEGES ON DATABASE helpdesk_db TO helpdesk;"
EOF

echo "PostgreSQL and Redis configured successfully."
