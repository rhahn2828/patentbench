"""Google Gemini model adapter for PatentBench.

Supports Gemini 2.5 Pro, Flash, and other Google AI models.
"""

from __future__ import annotations

import os
from typing import Any

from patentbench.models.base import BaseModelAdapter, GenerationConfig


class GoogleAdapter(BaseModelAdapter):
    """Model adapter for Google Gemini models.

    Usage:
        adapter = GoogleAdapter(model_name="gemini-2.5-pro")
        response = adapter.generate("Draft arguments against this 103 rejection...")
    """

    def __init__(
        self,
        model_name: str = "gemini-2.5-pro",
        api_key: str | None = None,
        config: GenerationConfig | None = None,
    ) -> None:
        super().__init__(model_name=model_name, config=config)
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY", "")
        self._model: Any = None

    @property
    def model(self) -> Any:
        """Lazy-initialize the Gemini model."""
        if self._model is None:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._model = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=self.config.system_prompt or None,
                )
            except ImportError:
                raise ImportError(
                    "Google Generative AI SDK not installed. "
                    "Install with: pip install patentbench[google]"
                )
        return self._model

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> str:
        """Generate a response using the Google Gemini API.

        Args:
            prompt: The patent prosecution task prompt.
            config: Optional generation config override.

        Returns:
            The model's response text.
        """
        cfg = config or self.config

        try:
            import google.generativeai as genai
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=cfg.max_tokens,
                temperature=cfg.temperature,
                top_p=cfg.top_p,
                stop_sequences=cfg.stop_sequences or None,
            )
        except ImportError:
            raise ImportError(
                "Google Generative AI SDK not installed. "
                "Install with: pip install patentbench[google]"
            )

        response = self.model.generate_content(
            prompt,
            generation_config=generation_config,
        )

        return response.text or ""

    def is_available(self) -> bool:
        """Check if Google API key is configured."""
        return bool(self.api_key)
