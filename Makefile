.PHONY: demo test test-policy test-console console check

demo:            ## Run the Python reference walkthrough
	cd reference && python -m boundary

test-policy:     ## Python engine tests (no dependencies)
	cd reference && python -m unittest discover -s tests -v

test-console:    ## TypeScript policy-mirror tests
	bun run test

test: test-policy test-console

console:         ## Start the local operator console simulation
	bun install --frozen-lockfile && bun run dev

check: test      ## Everything CI runs
	bun run build
