This is a python + dash webapp for personal finance tracking and retirement planning with accounts in both the US and UK. `uv` is used to manage the python environment

## Layout

The dashboard contains 5 tabs
- summary: high level metrics about net worth spending and how it compares year over year
- networth: visualisations of how networth has changed over time 
- income: visualisations of how income has changed over time 
- spending: visualisations of how spending has changed over time 
- FIRE: key metrics and visualisations for financial independence and retiring early

## Tech Stack

- always use `polars` for data frame manipulation. Never `pandas`.

The coding conventions can be found in `agent-docs/coding_conventions.md`
