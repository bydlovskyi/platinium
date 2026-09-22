FROM mcr.microsoft.com/playwright:v1.49.0-jammy

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# The docker-sandbox CLI's init script runs `chown root:docker /var/run/docker.sock`
# inside the container. The Playwright base image has no `docker` group, so the
# chown fails and the container exits before Claude starts. Create the group.
RUN groupadd -f docker

RUN npm install -g @anthropic-ai/claude-code @playwright/mcp

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# oxc-parser/oxc-transform/oxc-minify native binaries require CPU instructions
# (e.g. AVX2) that the VM sandbox doesn't expose, causing SIGILL on load.
# Setting this env var makes their NAPI-RS loader skip all platform-native
# branches entirely (they're guarded by else-if) and fall through to the WASM
# fallback (@oxc-*/binding-wasm32-wasi), which is already installed.
ENV NAPI_RS_NATIVE_LIBRARY_PATH=/nonexistent
