# Small Switch

> A student wants to live more sustainably, but "save energy" is vague. They can't tell which habits matter, or by how much.

Small Switch turns everyday swaps into numbers. Pick the switches you'll make, set the sliders to match your real habits, and see what they save in a year: CO₂, water, energy, money and plastic bottles. Then multiply it by your household, class or school, and track the days you actually stick with it.

## Switches

| Switch | What it saves | How it's calculated |
| --- | --- | --- |
| Shorter showers | Water, water-heating energy, CO₂, money | minutes × showers/week × 52 × flow rate; two-thirds hot water |
| Wash clothes in cold | Water-heating energy, CO₂, money | loads/week × 52 × gallons/load × half hot |
| Air-dry laundry | Electricity, CO₂, money | loads/week × 52 × kWh per dryer load |
| LED bulbs | Electricity, CO₂, money | bulbs × (old W − 9 W) × hours/day × 365 |
| Walk or bike short trips | Gasoline, CO₂, money | distance/week × 52 ÷ mpg × 8.887 kg CO₂/gal |
| Reusable bottle | Plastic bottles, money | bottles/week × 52 |

Every formula is shown in the app under "How we calculate", and every price and emission factor can be changed under "My home and prices", including the water heater type (electric or gas) and the local grid's CO₂ per kWh.

## Making it actionable

- **Scale it up:** count the savings for just you, your household, your class (30) or your school (500), or type any number.
- **Track it:** tick each day you stick with a switch to see what you've actually saved this week.
- **Share it:** share a link that opens with your switches and settings, or print your plan.

## Sources

- US EPA, [Greenhouse Gas Equivalencies Calculator: calculations and references](https://www.epa.gov/energy/greenhouse-gases-equivalencies-calculator-calculations-and-references): 8.887 kg CO₂ per gallon of gasoline, 5.3 kg CO₂ per therm of natural gas, 0.394 kg CO₂ per kWh (US average, eGRID 2022), 22.8 mpg average fuel economy, and about 4.6 t CO₂ per passenger car per year
- US EPA, [eGRID](https://www.epa.gov/egrid)
- US EPA WaterSense, [showerheads](https://www.epa.gov/watersense/showerheads)
- US DOE Energy Saver, [water heating](https://www.energy.gov/energysaver/water-heating) and [LED lighting](https://www.energy.gov/energysaver/led-lighting)
- ENERGY STAR, [clothes washers](https://www.energystar.gov/products/clothes_washers)
- US EIA, [electricity](https://www.eia.gov/electricity/)

## Limitations

- Results are estimates built from averages, not measurements of your home.
- The default grid factor is the US average; cleaner or dirtier local grids change the CO₂ result, so it's editable.
- The bottle switch counts bottles and money only. CO₂ per bottle varies too much by source to state confidently.
- Rebound effects (for example, spending the money saved on something carbon-intensive) aren't modeled.
- Savings in the "My switch plan" tracker are a daily average of the yearly figure, not a measurement of each day.

## Run it

It's a static site with no build step and no API keys. Open `index.html` through any local web server, for example:

```bash
python3 -m http.server 5174
```

Then go to http://localhost:5174. To deploy, import the repo into Vercel, Netlify or GitHub Pages.

## Credits and AI assistance

- Built with help from Claude Code (AI coding assistant).
- [Tabler Icons](https://tabler.io/icons) (MIT), [Nunito](https://fonts.google.com/specimen/Nunito) via Google Fonts (SIL Open Font License).

## License

MIT
