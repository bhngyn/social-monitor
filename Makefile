.PHONY: setup update start stop restart logs logs-api logs-worker shell-api shell-db migrate migration seed reset-db status clean

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example"; \
	fi
	docker compose up --build -d
	@echo "Waiting for database to be healthy..."
	@until docker compose exec db pg_isready -U social_monitor > /dev/null 2>&1; do \
		sleep 2; \
	done
	@echo "Database is ready."
	docker compose exec api alembic upgrade head
	@echo "Setup complete."

update:
	git pull
	docker compose up --build -d
	docker compose exec api alembic upgrade head
	@echo "Update complete."

start:
	docker compose up -d

stop:
	docker compose down

restart: stop start

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-worker:
	docker compose logs -f worker

shell-api:
	docker compose exec api bash

shell-db:
	docker compose exec db psql -U social_monitor

migrate:
	docker compose exec api alembic upgrade head

migration:
	docker compose exec api alembic revision --autogenerate -m "$(msg)"

seed:
	docker compose exec api python -m app.seed

reset-db:
	docker compose down -v
	$(MAKE) setup

status:
	docker compose ps

clean:
	docker compose down -v --rmi local
