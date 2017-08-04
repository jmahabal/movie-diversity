var d3 = require('d3');
var fs = require('fs');
var _ = require('lodash');

const width = 400;
const height = 160;
const margin = {"top": 40, "bottom": 40, "right": 40, "left": 70};

const generateSvg = function(data, title, year) {

    var Canvas = require('canvas');
    var canvas = new Canvas(width + margin.left + margin.right, height + margin.top + margin.bottom);
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    ctx.fillStyle = "rgba(250,239,209,1)";
    ctx.fillStyle = "white";

    ctx.fillRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
    ctx.fillStyle = "black";

    ctx.translate(margin.left + 0.5, margin.top + 0.5);

    let xScale = d3.scaleLinear().domain([0, 20]).range([0, width]);
    let yScale = d3.scaleBand().domain(["Female", "Male", "N/A"]).range([0, height]).paddingOuter(0.3).paddingInner(0.3);

    var xTickCount = 5;
    var xTicks = xScale.ticks(xTickCount);

    ctx.beginPath();
    xTicks.forEach(function(d) {
      ctx.moveTo(xScale(d), height);
      ctx.lineTo(xScale(d), height + 6);
    });
    ctx.strokeStyle = "black";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    xTicks.forEach(function(d) {
      ctx.fillText(d, xScale(d), height + 8);
    });

    ctx.beginPath();

    ctx.strokeStyle = "black";
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    ctx.font = "12px sans-serif";

    yScale.domain().forEach(function(d) {
      ctx.fillText(d, -12 + 0.5, yScale(d) + yScale.bandwidth() / 2  + 0.5);
    });

    // For filling in the line across axis

    ctx.beginPath();
    ctx.moveTo(0, height + 0.5);
    ctx.lineTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, height + 0.5);
    ctx.strokeStyle = "black";
    ctx.stroke();

    // Text
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "12px sans-serif";
    ctx.fillText("# in Cast", width, height - 6);

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = "16px sans-serif";
    ctx.fillText(`${title} (${year})`, width/2, -6);

    ctx.restore();

    ctx.fillStyle = "rgb(116,160,137)";
    ctx.fillStyle = "rgb(180,15,32)";

    data.forEach(function(d) {
      ctx.fillRect(0.5, yScale(d[0]) + 0.5, xScale(d[1]), yScale.bandwidth());
    });

    canvas.toDataURL('image/jpeg', 1, function(err, jpeg){ 
      // console.log(jpeg);
    })

    return canvas.toDataURL();

}


const generateSvgBackup = function(data, title, year) {

    let svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    let xScale = d3.scaleLinear().domain([0, 20]).range([0, width]);
    let yScale = d3.scaleBand().domain(["Female", "Male", "N/A"]).range([0, height]).paddingOuter(0.1).paddingInner(0.4);

    svg.selectAll("rect")
      .data(data).enter()
      .append("rect")
        .attr("x", 0)
        .attr("y", x => yScale(x[0]))
        .attr("width", x => xScale(x[1]))
        .attr("height", yScale.bandwidth())
        .style("fill", "rgb(116,160,137)")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(d3.axisLeft(yScale).tickSize(0));

    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
      .call(d3.axisBottom(xScale).ticks(4));

    svg.append("text")
      .attr("x", width)
      .attr("y", height - 6)
      .attr("text-anchor", "end")
      .text("# in Cast")
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("text")
      .attr("x", width/2)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-family", "sans-serif")
      .attr("font-size", "12px")
      .text(`${title} (${year})`)
      .attr("transform", "translate(" + margin.left + "," + (margin.top - 6) + ")");

  let canvas = fabric.createCanvasForNode(width + margin.left + margin.right, height + margin.top + margin.bottom);
  canvas.backgroundColor = 'rgba(250,239,209,1)';
  canvas.enableRetinaScaling = false;

  const returnDataUrl = function(objects, options) {

    let obj = fabric.util.groupSVGElements(objects, options);
    canvas.add(obj).renderAll();

    let img2 = canvas.toDataURL({format: 'png'});
    // console.log(img2);

    let statusData = {
      "castMemberCount": castLimit,
      "movieTitle": title,
      "movieYear": year,
      "breakdown": generateAltText(data),
      "dataUrl": img2.split(",")[1]
    }

    postToTwitter(statusData);

  }

  fabric.loadSVGFromString(d3.select("body").html(), returnDataUrl);

}

const sampleData = [['Female', 6], ['Male', 6], ['N/A', 6]];

// const a = generateSvg([["Male", 17], ["Female", 4], ["N/A", 2]], 'Dunkirk', '2017');
// console.log(a);
let majority = _.filter(sampleData, x => x[1] > 20/2);
let max = _.filter(sampleData, y => y[1] === _.maxBy(sampleData, x => parseInt(x[1]))[1]).map(z => z[0].toLowerCase()).join(" or ");
let largestCohortText = _.isEmpty(majority) 
            ? `most were ${max}.`
            : `the majority were ${majority[0][0].toLowerCase()}.`;

console.log(largestCohortText)