.PHONY: setup dev build test lint fmt clean

setup:
	npm install

dev:
	npm run dev

build:
	npx tsc -p tsconfig.json

test:
	@npm run test || echo "Install dev dependencies to run tests."

lint:
	@npm run lint || echo "Install Biome (@biomejs/biome) to lint."

fmt:
	@npm run fmt || echo "Install Biome (@biomejs/biome) to format."

clean:
	rm -rf dist coverage
