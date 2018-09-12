## TESTS

TESTER = ./node_modules/.bin/mocha
OPTS = -G --timeout 10000
TESTS = test/*.test.js

test:
	$(TESTER) $(OPTS) $(TESTS)
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)
.PHONY: test docs

.PHONY: b benchmark benchmarks
b benchmark benchmarks:
	@node benchmarks >> $(CURDIR)/benchmarks/results.md \
		&& echo 'Done. See ./benchmarks/results.md'

.PHONY: l ld leak leak-detection
l ld leak leak-detection:
	npm i @airbnb/node-memwatch --no-save || npm i memwatch-next --no-save
	@ITERATIONS=$(ITERATIONS) $(TESTER) leak-detection \
		--recursive \
		--reporter spec \
		--require $(CURDIR)/leak-detection/globals \
		--timeout 60000
