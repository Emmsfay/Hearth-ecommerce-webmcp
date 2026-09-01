# Hearth

A standard shop built for the [WebMCP Challenge](https://webmcp.devpost.com/). People browse, search, and check out as usual. Agents use the same live page through tools instead of guessing at buttons.

## Why WebMCP

Shopping is the textbook case. An agent that clicks tiles is slow and wrong. Hearth declares `search_products`, `filter_results`, `add_to_cart`, `fill_checkout`, and `place_order`. The person still sees the bag open and still confirms the purchase.

## Run

```bash
cd ~/hearth
sudo docker compose up --build
```

Open http://localhost:8084

Or serve the folder with any static server.

## Demo prompt

In ChatGPT’s in-app browser:

> Find a gift under £40 for someone who cooks, add it to my bag, apply HEARTH10, and start checkout for Ada Okonkwo in Manchester.

`place_order` requires `confirm: true` after the person agrees. No real payment is taken.

## License

MIT
