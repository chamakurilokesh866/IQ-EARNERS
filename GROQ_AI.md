# AI for Question Generation

Admin quiz question generation uses **NVIDIA NIM** only.

## Setup

1. Get an API key at [build.nvidia.com](https://build.nvidia.com)
2. Add to `.env.local`:
   ```
   NVIDIA_API_KEY=nvapi-xxx...
   ```
3. Optional: `NVIDIA_MODEL=meta/llama-3.1-8b-instruct` (default)
4. Optional: `NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1` (default)
5. Restart the dev server after changing `.env.local`
