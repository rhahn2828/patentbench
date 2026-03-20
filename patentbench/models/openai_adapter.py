"""OpenAI model adapter for PatentBench.

Supports GPT-4o, GPT-5, and other OpenAI models via the OpenAI Python SDK.
"""

from __future__ import annotations

import os
from typing import Any

from patentbench.models.base import BaseModelAdapter, GenerationConfig


class OpenAIAdapter(BaseModelAdapter):
    """Model adapter for OpenAI models (GPT-4o, GPT-5, etc.).

    Usage:
        adapter = OpenAIAdapter(model_name="gpt-4o")
        response = adapter.generate("Draft arguments against this 103 rejection...")
    """

    def __init__(
        self,
        model_name: str = "gpt-4o",
        api_key: str | None = None,
        config: GenerationConfig | None = None,
    ) -> None:
        super().__init__(model_name=model_name, config=config)
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self._client: Any = None

    @property
    def client(self) -> Any:
        """Lazy-initialize the OpenAI client."""
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "OpenAI SDK not installed. Install with: pip install patentbench[openai]"
                )
        return self._client

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> str:
        """Generate a response using the OpenAI API.

        Args:
            prompt: The patent prosecution task prompt.
            config: Optional generation config override.

        Returns:
            The model's response text.
        """
        cfg = config or self.config

        messages: list[dict[str, str]] = []
        if cfg.system_prompt:
            messages.append({"role": "system", "content": cfg.system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            max_tokens=cfg.max_tokens,
            temperature=cfg.temperature,
            top_p=cfg.top_p,
            stop=cfg.stop_sequences or None,
        )

        return response.choices[0].message.content or ""

    def is_available(self) -> bool:
        """Check if OpenAI API key is configured."""
        return bool(self.api_key)
