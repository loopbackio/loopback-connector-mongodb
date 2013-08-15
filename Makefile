## TESTS

TESTER = ./node_modules/.bin/mocha
OPTS = -G
TESTS = test/*.test.js

test:
	$(TESTER) $(OPTS) $(TESTS)
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)
coverage:
	$(TESTER) $(OPTS) -r blanket -R html-cov $(TESTS) > coverage_loopback-connector-mongodb.html

.PHONY: test docs
