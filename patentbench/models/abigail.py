"""ABIGAIL patent AI model adapter.

Connects to the ABIGAIL API at abigail.app for patent prosecution tasks.
"""

from __future__ import annotations

import httpx

from patentbench.models.base import BaseModelAdapter, GenerationConfig


ABIGAIL_API_BASE = "https://abigail.app/api/v1"


class AbigailAdapter(BaseModelAdapter):
    """Model adapter for ABIGAIL patent AI (abigail.app).

    ABIGAIL is a specialized patent prosecution AI that handles Office Action
    parsing, argument drafting, claim amendment, and other patent tasks.

    Usage:
        adapter = AbigailAdapter(api_key="your-api-key")
        response = adapter.generate("Draft arguments against this 103 rejection...")
    """

    def __init__(
        self,
        api_key: str,
        api_base: str = ABIGAIL_API_BASE,
        model_name: str = "abigail-v3",
        config: GenerationConfig | None = None,
        timeout: float = 120.0,
    ) -> None:
        super().__init__(model_name=model_name, config=config)
        self.api_key = api_key
        self.api_base = api_base.rstrip("/")
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    def generate(self, prompt: str, config: GenerationConfig | None = None) -> str:
        """Generate a response using the ABIGAIL API.

        Args:
            prompt: The patent prosecution task prompt.
            config: Optional generation config override.

        Returns:
            ABIGAIL's response text.
        """
        cfg = config or self.config

        payload = {
            "prompt": prompt,
            "max_tokens": cfg.max_tokens,
            "temperature": cfg.temperature,
        }
        if cfg.system_prompt:
            payload["system_prompt"] = cfg.system_prompt

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        response = self.client.post(
            f"{self.api_base}/benchmark/generate",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", data.get("text", ""))

    def is_available(self) -> bool:
        """Check if the ABIGAIL API is accessible."""
        try:
            response = self.client.get(
                f"{self.api_base}/health",
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            return response.status_code == 200
        except (httpx.HTTPError, httpx.ConnectError):
            return False

    def parse_office_action(self, office_action_text: str) -> dict:
        """Use ABIGAIL's specialized OA parsing endpoint.

        Args:
            office_action_text: Raw Office Action text or XML.

        Returns:
            Parsed OA data including rejections, claims, and grounds.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        response = self.client.post(
            f"{self.api_base}/parse-oa",
            json={"office_action": office_action_text},
            headers=headers,
        )
        response.raise_for_status()
        return response.json()

    def close(self) -> None:
        self.client.close()

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass
