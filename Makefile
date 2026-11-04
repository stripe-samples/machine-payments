SAMPLES := mcp/server/node-typescript \
           mpp/server/node-typescript mpp/server/python \
           x402/batch-payout/node-typescript \
           x402/server/node-typescript x402/server/python

.PHONY: install lint format typecheck test ci

install lint format typecheck test ci:
	@for dir in $(SAMPLES); do \
		echo "\n==> $$dir: $@"; \
		$(MAKE) -C $$dir $@ || exit 1; \
	done
