FROM mcr.microsoft.com/playwright:v1.49.0-jammy

RUN apt-get update && apt-get install -y curl git jq xz-utils && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# The Playwright image ships Node 22.11, which satisfies neither branch of this
# project's engines field (^20.19.0 || >=22.12.0) and makes `npm ci` fail with
# EBADENGINE. Install the 20.19 line named in .nvmrc so the agent builds on the
# same runtime the developers use.
#
# apt won't help here: the base image's nodejs package is already NEWER, so
# `apt-get install nodejs` from the 20.x repo is a silent no-op. Unpack the
# official tarball into /usr/local instead, which precedes /usr/bin on PATH.
# This must happen BEFORE the global npm installs below.
RUN NODE_VER=$(curl -fsSL https://nodejs.org/dist/index.json \
      | jq -r '[.[] | select(.version | startswith("v20.19."))][0].version') && \
    ARCH=$(dpkg --print-architecture | sed 's/amd64/x64/') && \
    echo "Installing Node ${NODE_VER} (${ARCH})" && \
    curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-${ARCH}.tar.xz" \
      -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 && \
    rm /tmp/node.tar.xz && \
    node -v && npm -v

RUN npm install -g @anthropic-ai/claude-code @playwright/mcp

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Playwright MCP looks for Chrome at a fixed path. Symlink it here as root —
# the agent runs unprivileged and cannot write to /opt itself.
RUN mkdir -p /opt/google/chrome && \
    ln -sf "$(ls -d /ms-playwright/chromium-*/chrome-linux/chrome | head -n1)" \
           /opt/google/chrome/chrome

# Claude Code refuses --dangerously-skip-permissions when running as root, so
# the agent needs an unprivileged user with a home directory of its own.
RUN useradd -m -s /bin/bash ralph && \
    mkdir -p /work && chown -R ralph:ralph /work

COPY entrypoint.sh /usr/local/bin/ralph-entrypoint
RUN chmod +x /usr/local/bin/ralph-entrypoint

USER ralph
WORKDIR /work
ENTRYPOINT ["/usr/local/bin/ralph-entrypoint"]
