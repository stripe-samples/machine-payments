.PHONY: install run lint format typecheck test ci

install:
	pnpm install

run:
	pnpm run dev

lint:
	pnpm exec biome check .

format:
	pnpm exec biome check --write .

typecheck:
	pnpm run build

test:
	pnpm exec vitest run

ci: install lint typecheck test
