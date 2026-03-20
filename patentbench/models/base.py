"""Base model adapter interface for PatentBench.

All model adapters must implement this interface to be used with the
benchmark runner.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GenerationConfig:
    """Configuration for model text generation."""

    max_tokens: int = 4096
    temperature: float = 0.0
    top_p: float = 1.0
    stop_sequences: list[str] = field(default_factory=list)
    system_prompt: str = ""


DEFAULT_PATENT_SYSTEM_PROMPT = """You are an expert patent attorney with deep knowledge of U.S. patent law, including 35 U.S.C. sections 101, 102, 103, and 112, the Manual of Patent Examining Procedure (MPEP), and Federal Circuit case law. Provide precise, well-reasoned responses grounded in actual legal authority. Do not fabricate case citations, MPEP section numbers, or statutory provisions."""


class BaseModelAdapter(ABC):
    """Abstract base class for model adapters.

    Subclasses must implement the `generate` method to connect to their
    respective model APIs.

    Usage:
        class MyModelAdapter(BaseModelAdapter):
            def generate(self, prompt: str, config: GenerationConfig | None = None) -> str:
                return my_api_call(prompt)

        adapter = MyModelAdapter(model_name="my-model")
        response = adapter.generate("What is 35 U.S.C. 103?")
    """

    def __init__(
        self,
        model_name: str,
        config: GenerationConfig | None = None,
    ) -> None:
        self.model_name = model_name
        self.config = config or GenerationConfig(
            system_prompt=DEFAULT_PATENT_SYSTEM_PROMPT,
        )

    @abstractmethod
    def generate(self, prompt: str, config: GenerationConfig | None = None) -> str:
        """Generate a response to the given prompt.

        Args:
            prompt: The user prompt / task description.
            config: Optional override generation config.

        Returns:
            The model's text response.
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this model adapter is properly configured and accessible."""
        ...

    def get_info(self) -> dict[str, Any]:
        """Return metadata about this model adapter."""
        return {
            "model_name": self.model_name,
            "adapter_class": self.__class__.__name__,
            "available": self.is_available(),
        }
