<template>
  <div class="map-wrapper">
    <h2 v-if="province" class="province-title">{{province.state}}</h2>
    <div v-if="currentProvince" class="province-info">
      <h3 class="text-center">{{currentProvince.state}}</h3>
      <ul>
        <li>지역: {{currentProvince.SIG_KOR_NM}}</li>
        <li>영문: {{currentProvince.SIG_ENG_NM}}</li>
      </ul>
    </div>
    <svg></svg>
  </div>
  <div>
    <q-img
      ref="myImg"
      src="~assets/sample.jpg"
      spinner-color="white"
      style="height: 140px; max-width: 150px"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';
import koreaMap from 'src/use/korea-sgg.json'
import imageInfo from 'src/use/imageInfo';

export default {
  name: 'PageIndex', 
  setup () {
    let province = ref(null);
    let currentProvince = ref(null);

    let myImg = ref(null);
    let location = ref(null)

    const selectProvince = (( province ) => {
      // console.log(province);
      // if (province === 'undefined') {
        
      //   province.value = null;
      // }
      province.value = province;
    })

    const openInfo = (( province ) => {
      currentProvince.value = province
    })

    const closeInfo = (() => {
      currentProvince.value =  '';
    })

    let centered = null;
    let mapCenter = {
      lat: 37,
      lng: 126
    };
    let size = {
      height: 700,
      width: 1200//d3.select('.map-wrapper').node().getBoundingClientRect().width,  
    };

    let initialScale = 6500;
    
      

    let color = d3.scale.linear()
    .domain([1, 20])
    .clamp(true)
    .range(['#08304b', '#08304b']);
  
    let projection = d3.geo.equirectangular()
      .scale(initialScale)
      .center([mapCenter.lng, mapCenter.lat])
      .translate([size.width / 2, size.height / 2]);

    let path = d3.geo.path()
      .projection(projection);


    let svg;
    let g;
    let effectLayer;
    let mapLayer;

    onMounted( async () => {
      
      console.log(await imageInfo.getImageGps('/sample.jpg'));

      svg = d3.select('svg')
        .attr('width', size.width)
        .attr('height', size.height);

      svg.append('defs');

      // console.log('koreaMap ', koreaMap.features);

      svg = imageInfo.getSvgPattern(koreaMap.features, svg);

      // svg.append('pattern')
      //   .attr('id', 'imgpattern')
      //   .attr('x','0')
      //   .attr('y','0')
      //   .attr('width', '1')
      //   .attr('height', '1')
      //   .append("image")
      //   .attr("xlink:href", "https://unsplash.it/300/300")
      //   .attr("width", "400")
      //   .attr("height", "400");

      // Add background
      svg.append('rect')
        .attr('class', 'background')
        .attr('width', size.width)
        .attr('height', size.height)
        .on('click', clicked);
        
      g = svg.append('g');
  
      effectLayer = g.append('g')
        .classed('effect-layer', true);
      mapLayer = g.append('g')
        .classed('map-layer', true);



      var imgs = svg.selectAll("pattern").data([0]);

      console.log('imgs : ', imgs);



      // Load map data
      let geoJsonUrl = 'js/korea-sgg.json';
      // let geoJsonUrl = 'https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson';
      d3.json(geoJsonUrl, function(error, mapData) {

        var features = mapData.features;
        // console.log('features', features[0].geometry.coordinates[0]);
        
        let location = imageInfo.getImageLocation( features, 37.4046341 , 127.8842384);
        // console.log(location);

        // Update color scale domain based on data
        color.domain([0, d3.max(features, nameLength)]);

        // Draw each province as a path
        mapLayer.selectAll('path')
            .data(features)
            .enter()
            .append('path') 
            .attr('d', path)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('fill', fillFn)
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .on('click', clicked);

      });
    });

    

    function clicked(d) {
      var x, y, k;

      // Compute centroid of the selected path
      if (d && centered !== d) {
        var centroid = path.centroid(d);
        x = centroid[0];
        y = centroid[1];
        k = 4;
        centered = d;
        openInfo(d.properties);
      } else {
        x = size.width / 2;
        y = size.height / 2;
        k = 1;
        centered = null;
        closeInfo();
      }

      // Highlight the clicked province
      mapLayer.selectAll('path')
        .style('fill', function(d){
          return centered && d===centered ? '#D5708B' : fillFn(d);
      });

      // Zoom
      g.transition()
        .duration(750)
        .attr('transform', 'translate(' + size.width / 2 + ',' + size.height / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');
    }

    function mouseover(d){
      // Highlight hovered province
      // console.log(d.properties.SIG_ENG_NM);
      // if (d.properties.SIG_ENG_NM === 'Wonju-si') {
      let id = '#' + d.properties.SIG_ENG_NM ;
      console.log(d3.select(id));
          
      d3.select(this).style('fill', `url('#Wonju-si')`);

      if(d) {
        selectProvince(d.properties);
      }
      

    //  d3.select(this)
    //      .append("svg:image")
    //      .attr("xlink:href", "/sample.jpg")
    //      .attr("cx", 700)
    //      .attr("cy", 300)
    //      .attr("height", 10)
    //      .attr("width", 10);

    //   if(d) {
    //     selectProvince(d.properties);
    //   }


      
    }

    function mouseout(d){
      // console.log('d : ', d);
      // selectProvince();
      // province.value =null;
      // // Reset province color
      // mapLayer.selectAll('path')
      //   .style('fill', (d) => {
      //     return centered && d===centered ? '#D5708B' : fillFn(d);
      //   });
    }

    // Get province name length
    function nameLength(d){
      const n = nameFn(d);
      return n ? n.length : 0;
    }

    // Get province name
    function nameFn(d){
      return d && d.properties ? d.properties.name : null;
    }

    // Get province color
    function fillFn(d){
      return color(nameLength(d));
    }

    
    return {
      province,
      currentProvince,
      myImg
    }
  }

}
</script>
<style lang="scss">
.map-wrapper {
  .province-title {
    position: absolute;
    top: 50px;
    left: 150px;
    color: white;
  }
  .province-info {
    background: white;
    position: absolute;
    top: 150px;
    right: 20px;
    height: 400px;
    width: 300px;
  }
  .background {
    // fill: #021019;
    fill: none;
    pointer-events: all;
  }
  .map-layer {
    fill: #08304b;
    // fill : url('#imgpattern');
    stroke: #021019;
    stroke-width: 1px;
  }
}
</style>