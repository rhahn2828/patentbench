"""Anthropic Claude model adapter for PatentBench.

Supports Claude Sonnet, Opus, Haiku, and other Anthropic models.
"""

from __future__ import annotations

import os
from typing import Any

from patentbench.models.base import BaseModelAdapter, GenerationConfig


class AnthropicAdapter(BaseModelAdapter):
    """Model adapter for Anthropic Claude models.

    Usage:
        adapter = AnthropicAdapter(model_name="claude-sonnet-4-20250514")
        response = adapter.generate("Draft arguments against this 103 rejection...")
    """

    def __init__(
        self,
        model_name: str = "claude-sonnet-4-20250514",
        api_key: str | None = None,
        config: GenerationConfig | None = None,
    ) -> None:
        super().__init__(model_name=model_name, config=config)
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        self._client: Any = None

    @property
    def client(self) -> Any:
        """Lazy-initialize the Anthropic client."""
        if self._client is None:
            try:
                from anthropic import Anthropic
                self._client = Anthropic(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "Anthropic SDK not installed. Install with: pip install patentbench[anthropic]"
                )
        return self._client

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> str:
        """Generate a response using the Anthropic API.

        Args:
            prompt: The patent prosecution task prompt.
            config: Optional generation config override.

        Returns:
            The model's response text.
        """
        cfg = config or self.config

        kwargs: dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": cfg.max_tokens,
            "temperature": cfg.temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if cfg.system_prompt:
            kwargs["system"] = cfg.system_prompt

        response = self.client.messages.create(**kwargs)

        # Extract text from response content blocks
        text_parts: list[str] = []
        for block in response.content:
            if hasattr(block, "text"):
                text_parts.append(block.text)
        return "\n".join(text_parts)

    def is_available(self) -> bool:
        """Check if Anthropic API key is configured."""
        return bool(self.api_key)
