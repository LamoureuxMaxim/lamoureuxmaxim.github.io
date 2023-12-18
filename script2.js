// Global variables
let correlationCoefficients;

// Data loading and preprocessing
function loadData() {
  return d3.csv("normalized_data_with_correlation.csv").then(data => {
    // Extract and store the last row as correlation coefficients
    correlationCoefficients = data.pop();

    // Process and prepare the remaining data
    data.forEach(d => {
      d.population = +d['Population (2020)'];
    });
    return data;
  });
}

function splitText(text, width, fontSize) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = words[0];

    const context = document.createElement("canvas").getContext("2d");
    context.font = `${fontSize}px sans-serif`;

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const widthOfLine = context.measureText(currentLine + " " + word).width;
        if (widthOfLine < width) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// Function to get block size based on the attribute
function getBlockSize(d, attribute) {
  let size;
  if (attribute === 'Population (2020)') {
    // Use a power scale for the population to increase variance in block sizes
    size = Math.pow(d.population, 0.4);
  } else {
    // For normalized attributes
    size = parseFloat(d[attribute]);
  }

  // Set a minimum size threshold to ensure visibility
  const minSize = 5; // Adjust this value as needed
  return Math.max(size, minSize);
}

// Function to sort data based on the selected attribute
function sortData(data, attribute) {
  return data.sort((a, b) => getBlockSize(b, attribute) - getBlockSize(a, attribute));
}

// Define SVG dimensions and margins
const margin = { top: 10, right: 10, bottom: 10, left: 10 },
  width = window.innerWidth - margin.left - margin.right,
  height = 800; // Adjusted height for better visibility

// Append SVG to the body for the main treemap
const svg = d3.select("#treemap-container").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Define a color scale for happiness score
const colorScale = d3.scaleLinear()
  .domain([0, 100]) // Normalized happiness score range
  .range(["red", "blue"]); // Color range

// Function to create the main treemap
function createMainTreemap(data, sortBy = 'Happiness score') {
  // Sort the data based on the sortBy argument
  data = sortData(data, sortBy);

  // Define the root of the treemap using the sorted data
  const root = d3.hierarchy({ children: data })
      .sum(d => getBlockSize(d, sortBy))
      .sort((a, b) => b.height - a.height || b.value - a.value);

  // Set up the treemap
  d3.treemap()
      .size([width, height])
      .padding(1)
      (root);

  // Clear previous treemap cells
  svg.selectAll("g").remove();

  const cell = svg.selectAll("g")
  .data(root.leaves())
  .enter().append("g")
  .attr("transform", d => `translate(${d.x0},${d.y0})`);

  cell.append("rect")
  .attr("id", d => "rect-" + d.data.Country)
  .attr("width", d => d.x1 - d.x0)
  .attr("height", d => d.y1 - d.y0)
  .attr("fill", d => colorScale(d.data['Happiness score']))
  .attr("stroke", "#fff")
  .on("click", (event, d) => {
      console.log("Clicked data:", d); // 'd' should be the bound data
      onCountryClick(d.data);
  });

  // Add text to each cell
    // Append and format text
    cell.each(function(d) {
        const cellWidth = d.x1 - d.x0;
        const cellHeight = d.y1 - d.y0;
        const fontSize = 12; // Adjust as needed
        const textPadding = 4; // Adjust as needed

        const text = d3.select(this).append("text")
            .attr("x", cellWidth / 2)
            .attr("y", cellHeight / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", `${fontSize}px`);

        const lines = splitText(d.data.Country, cellWidth - textPadding, fontSize); // Use the appropriate property for the text

        lines.forEach((line, i) => {
            text.append("tspan")
                .attr("x", cellWidth / 2)
                .attr("dy", i === 0 ? 0 : `${fontSize}px`)
                .text(line);
        });
    });
}

// Event listener for the dropdown
d3.select("#sortOptions").on("change", function() {
  const selectedOption = d3.select(this).property("value");
  loadData().then(data => {
      createMainTreemap(data, selectedOption);
  });
});


const columnDisplayName = {
    "Log GDP per capita": "GDP per Capita",
    "Social support": "Social Support",
    "Healthy life expectancy at birth": "Healthy Life Expectancy",
    "Freedom to make life choices": "Freedom to Make Life Choices",
    "Generosity": "Generosity",
    "Perceptions of corruption": "Perceptions of Corruption (negative correlation)",
    "EPI.new": "EPI Score",
    "HLT.new": "Environmental Health",
    "AIR.new": "Air Quality Score",
    "H2O.new": "Water Quality Score",
    "COE.new": "CO2 Emissions Score",
    "BDH.new": "Biodiversity & Habitat Score",
};


// Function to create the secondary treemap
function createSecondaryTreemap(countryData) {

const populationInMillions = (countryData['Population (2020)'] / 1000000).toFixed(1);
    // Format the happiness score as an integer
const happinessScore = parseInt(countryData['Happiness score'], 10);


document.getElementById('header-container').innerHTML = `
<h1>${countryData.Country}: Happiness Score: ${happinessScore}, Population: ${populationInMillions}M</h1>`;


  // Hide the primary treemap and show the secondary treemap container
  document.getElementById('treemap-container').style.display = 'none';
  document.getElementById('secondary-treemap-container').style.display = 'block';

  // Define SVG for secondary treemap
  const secondarySVG = d3.select("#secondary-treemap").html('')
                          .append("svg")
                          .attr("width", width + margin.left + margin.right)
                          .attr("height", height + margin.top + margin.bottom)
                          .append("g")
                          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Convert country data to array format suitable for d3 hierarchy
  let children = Object.keys(countryData)
  .filter(key => key !== "Country" && key !== "Happiness score" && key !== "Population (2020)" && key !== "population")
  .map(key => ({
      name: key,
      value: countryData[key],
      correlation: Math.pow(Math.abs(parseFloat(correlationCoefficients[key])) || 0, 1.2) // Raise to the power of 2 for more aggressive scaling
  }));
  console.log("Children array:", children);

  // Define the root for the hierarchy
  let root = d3.hierarchy({ children: children })
               .sum(d => d.correlation);

  // Set up the treemap layout
  d3.treemap()
    .size([width, height])
    .padding(1)
    (root);

  // Create cells for the secondary treemap
  let cell = secondarySVG.selectAll("g")
                 .data(root.leaves())
                 .enter().append("g")
                 .attr("transform", d => `translate(${d.x0},${d.y0})`);

  // Create and style the rectangles (blocks)
  cell.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => colorScale(d.data.value));



      // Function to split text into lines

// Appending text to cells
cell.each(function(d) {
    const cellWidth = d.x1 - d.x0;
    const cellHeight = d.y1 - d.y0;
    const fontSize = 12; // Adjust as needed
    const textPadding = 4; // Adjust as needed

    const text = d3.select(this).append("text")
        .attr("x", cellWidth / 2)
        .attr("y", cellHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", `${fontSize}px`);

    const lines = splitText(columnDisplayName[d.data.name] || d.data.name, cellWidth - textPadding, fontSize);

    lines.forEach((line, i) => {
        text.append("tspan")
            .attr("x", cellWidth / 2)
            .attr("dy", i === 0 ? 0 : `${fontSize}px`)
            .text(line);
    });
});


}

// Function to handle click on a country
function onCountryClick(countryData) {
    console.log("Clicked country data:", countryData); // Log the data for debugging

    if (!countryData) {
        console.error('No data for selected country');
        return;
    }

    createSecondaryTreemap(countryData);
}

// Function to go back to the main treemap
document.getElementById('back-button').addEventListener('click', function() {
    document.getElementById('secondary-treemap-container').style.display = 'none';
    document.getElementById('treemap-container').style.display = 'block';

    // Restoring the title and descriptive text under the title
    document.getElementById('header-container').innerHTML = `
        <h1>TREEMAP OF HAPPINESS</h1>
        <div id="description-container">
            <p>The bluer, the happier. The bigger, the higher their</p>
            <!-- Dropdown for sorting options, ensure the ID and options are restored -->
            <select id="sortOptions">
                <option value="Happiness score">Happiness Score</option>
                <option value="Log GDP per capita">GDP per Capita</option>
                <option value="Social support">Social Support</option>
                <option value="Healthy life expectancy at birth">Healthy Life Expectancy</option>
                <option value="Freedom to make life choices">Freedom to Make Life Choices</option>
                <option value="Generosity">Generosity</option>
                <option value="Perceptions of corruption">Perceptions of Corruption</option>
                <option value="EPI.new">EPI Score</option>
                <option value="HLT.new">Environmental Health</option>
                <option value="AIR.new">Air Quality Score</option>
                <option value="H2O.new">Water Quality Score</option>
                <option value="COE.new">CO2 Emissions Score</option>
                <option value="BDH.new">Biodiversity & Habitat Score</option>
                <option value="Population (2020)">Population</option>
            </select>
        </div>
    `;

    // Reattach the event listener for the dropdown
    d3.select("#sortOptions").on("change", function() {
        const selectedOption = d3.select(this).property("value");
        loadData().then(data => {
            createMainTreemap(data, selectedOption);
        });
    });
});


function init() {
    loadData().then(data => {
        createMainTreemap(data);
    });
  }


// Start the visualization
init();
