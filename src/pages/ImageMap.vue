<template>
  <div class="map-wrapper">
    <h2 v-if="province" class="province-title">{{province.state}}</h2>
    <div v-if="currentProvince" class="province-info" >
      <h3 class="text-center">{{currentProvince.state}}</h3>
      <ul>
        <li>지역: {{currentProvince.SIG_KOR_NM}}</li>
        <li>영문: {{currentProvince.SIG_ENG_NM}}</li>
      </ul>
    </div>
    <svg></svg>
  </div>
  <div>
    <UploadImages refs="uploadImage" @changed="handleImages" :max='10' />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';
import koreaMap from 'src/use/korea-sgg.json'
import imageInfo from 'src/use/imageInfo';
// drag and drop 이미지 업로드
import UploadImages from 'src/components/UploadDropImages.vue'

export default {
    name: 'ImageMap', 
    components: {
        UploadImages,
    },

    setup () {
        let province = ref(null);
        let currentProvince = ref(null);

        // 이미지 
        const uploadImage = ref(null);
        const image = ref(null);
        const imageUrl = ref('');

        let labels;

        let bgImg = [];

        let rawImg = ref(null);

        // map 초기값
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

        // map svg 
        let svg;
        let g;
        let effectLayer;
        let mapLayer;

        const handleImages = ((files) => {
            let arrFile = [...files];

            console.log(arrFile)

            arrFile.map(async ( arr ) => {
                createBase64Image(arr);
            })
        })

        const createBase64Image = (async (fileObject) => {
            // 이미지 GPS 정보 확인
            
            let imgGps = await imageInfo.getImageGps(fileObject);

            console.log('imgGps ', imgGps);
            // GPS 정보로 사진 위치 확인
            let loc = imageInfo.getImageLoc(imgGps.latitute, imgGps.longitude);


            let info = {
                latitute : imgGps.latitute,
                longitude : imgGps.longitude,
                properties : loc.properties
            };
            
            loc.image = fileObject;
            


            
            // 이미지 base64
            let reader = new FileReader();
            reader.onload = async (e) => {
                rawImg.value = e.target.result;
                // imageInfo.setImage(fileObject.name, rawImg.value);
                // 서버에 이미지 저장
                let remoteUrl = await imageInfo.setDbImage(fileObject, rawImg.value, info);
                loc.url = remoteUrl.id;
                bgImg.push(loc)                
            };

            reader.readAsDataURL(fileObject);
            // reader.readAsBinaryString(fileObject);
        })

        const selectProvince = (( province ) => {
            province.value = province;
        })

        const openInfo = (( province ) => {
            currentProvince.value = province
        })

        const closeInfo = (() => {
            currentProvince.value =  '';
        })

        onMounted(()=> {
            rendor();
        })

        const rendor = ( async () => {
      
            svg = d3.select('svg')
                .attr('width', size.width)
                .attr('height', size.height);

            svg.append('defs');

            let imageArray = await imageInfo.getDbImage();
            console.log('imageArray', imageArray)
      
            svg = imageInfo.getSvgPattern(koreaMap.features, svg, imageArray);

      
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

      
            // Load map data
            let geoJsonUrl = 'js/korea-sgg.json';
            // let geoJsonUrl = 'https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson';
            d3.json(geoJsonUrl, function(error, mapData) {

                var features = mapData.features;

                // Update color scale domain based on data
                color.domain([0, d3.max(features, nameLength)]);

                // Draw each province as a path
                mapLayer
                    .selectAll('path')
                    .data(features)
                    .enter()
                    .append('path') 
                    .attr('d', path)
                    .attr('vector-effect', 'non-scaling-stroke')
                    .style('fill', fillFn)
                    // .style('fill', 'none')
                    .on('mouseover', mouseover)
                    .on('mouseout', mouseout)
                    .on('click', clicked);

                // labels = mapLayer
                //     .selectAll('text')
                //     .data(features)
                //     .enter()
                //     .append('text')
                //     .attr('class', 'text')
                //     .attr('transform', translateTolabel)
                //     .attr('id', function(d) {
                //         return 'label-' + d.properties.SIG_ENG_NM;
                //     })
                //     .attr('text-anchor', 'middle')
                //     // .attr('dy', '.15em')
                //     .attr('font-size', '10px')
                //     .attr('font-size-adjust', '0.58')
                //     .text(function(d) {
                //         return d.properties.SIG_KOR_NM;
                //     });

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
                return centered && d===centered ? fillFn(d) : fillFn(d);
                // return centered && d===centered ? '#D5708B' : fillFn(d);
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
            let sigEngNm = d.properties.SIG_ENG_NM;
            let id = '#img' + sigEngNm.replace(', ', '-') ;

            // document.querySelector(id).setAttribute('href', 'https://cdn.pixabay.com/photo/2020/02/14/15/35/dog-4848668_960_720.jpg');
            // document.querySelector(id).setAttribute('href', 'http://localhost:3030/blobs/7adbe0d4ebf1cc9e07e14aca92b8da91218cfaaf7904746a33548f475700c226.jpeg');
            let fillId = `url('#` + sigEngNm.replace(', ', '-') + `')`;
            // console.log('fillId', fillId);
            d3.select(this).style('fill', fillId);
            // d3.select(this).style('fill', `url('#Wonju-si')`);

            // console.log(d3.select(id)[0]);
            // bgImg.map((arr) => {
            //     document.querySelector(id).setAttribute('href', arr.image);
            //     let fillId = `url('#` + arr.properties.SIG_ENG_NM + `')`;
            //     console.log(arr);
            //     d3.select(this).style('fill', fillId );
            // })
            
            // document.querySelector(id).setAttribute('href', 'https://cdn.pixabay.com/photo/2020/02/14/15/35/dog-4848668_960_720.jpg');
                
            

            if(d) {
                selectProvince(d.properties);
            }
            
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
            // 이미지 조회 및 배경 매핑
            let sigEngNm = d.properties.SIG_ENG_NM;
            let fillId = `url('#` + sigEngNm.replace(', ', '-') + `')`;
            
            // return color(nameLength(d));
            return fillId;
        }

        // 텍스트 위치 조절 - 하드코딩으로 위치 조절을 했습니다.
        const translateTolabel = ((d) => {
            var arr = path.centroid(d);
            if (d.properties.code == 31) {
                //서울 경기도 이름 겹쳐서 경기도 내리기
                arr[1] +=
                    d3.event && d3.event.transform
                        ? d3.event.transform / height + 20
                        : initialScale / height + 20;
            } else if (d.properties.code == 34) {
                //충남은 조금 더 내리기
                arr[1] +=
                    d3.event && d3.event.transform
                        ? d3.event.transform / height + 10
                        : initialScale / height + 10;
            }
            return 'translate(' + arr + ')';
        })

        
        return {
            province,
            currentProvince,
            image,
            imageUrl,
            handleImages,
            uploadImage,
            rawImg,
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
    background: #FACCCA;
    position: absolute;
    border-radius: 7px;
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