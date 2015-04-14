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

b benchmark benchmarks:
	@node benchmarks >> $(CURDIR)/benchmarks/results.md \
		&& echo 'Done. See ./benchmarks/results.md'
