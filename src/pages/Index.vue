<template>
    <div class="map-wrapper">
        <!-- <h2 v-if="province" class="province-title">{{province.state}}</h2> -->
        <q-header bordered class="bg-white text-primary">
            <q-toolbar>
                <q-toolbar-title class="text-center">
                <q-avatar>
                    <img src="~assets/logo-map-icon.svg">
                </q-avatar>
                    이미지 여행 지도
                </q-toolbar-title>
            </q-toolbar>
        </q-header>
        <div v-if="currentProvince" class="province-info" >
            <q-card class="my-card" flat @click="currentProvince = null">
                <q-item>
                    <q-item-section avatar>
                    <q-avatar square >
                        <img src="https://cdn.pixabay.com/photo/2016/05/30/15/33/julia-roberts-1424985_960_720.png">
                    </q-avatar>
                    </q-item-section>

                    <q-item-section>
                    <q-item-label>{{currentProvince.SIG_KOR_NM}}</q-item-label>
                    <q-item-label caption>{{currentProvince.SIG_ENG_NM}}</q-item-label>
                    </q-item-section>
                </q-item>
                <q-img v-if="currentProvince.url" :src="currentProvince.url">
                    <!-- <div class="absolute-bottom text-h6">
                    Title
                    </div> -->
                </q-img>
            </q-card>   
        </div>
        <svg></svg>
    </div>
    <div>
        <UploadImages refs="uploadImage" @changed="handleImages" :max='10' />
        <!-- 시군구 선택 -->
        <q-dialog v-model="gpsCard">
        <q-card style="width:250px">
            <q-img src="https://cdn.quasar.dev/img/parallax2.jpg" />

            <q-card-section>
                <div class="q-gutter-sm">
                    <q-option-group
                        :options="selectedGpsoption"
                        type="radio"
                        v-model="selectedGps"
                    />
                </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
            <q-btn v-close-popup flat color="primary" label="선택" @click="saveImageGps"/>
            </q-card-actions>
        </q-card>
        </q-dialog>
        <!-- 지도에서 선택 후 파일 올리기 -->
        <q-dialog v-model="selectedMap">
        <q-card style="width:250px">
            <q-img src="https://cdn.quasar.dev/img/parallax2.jpg" />

            <q-card-section>
                <div v-if="currentProvince" class="q-gutter-sm">
                    {{currentProvince.SIG_KOR_NM}}
                </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
            <q-btn v-close-popup flat color="primary" label="선택" @click="saveImageGps"/>
            </q-card-actions>
        </q-card>
        </q-dialog>
    </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';
import koreaMap from 'src/use/korea-sgg.json'
import koreaMapCenter from 'src/use/korea-sgg-center.json'
import imageInfo from 'src/use/imgLocalInfo';
// drag and drop 이미지 업로드
import UploadImages from 'src/components/UploadDropImages.vue';

import { useQuasar } from 'quasar';

export default {
    name: 'ImageMap', 
    components: {
        UploadImages,
    },

    setup () {
        const $q = useQuasar();

        const screenWidthSize = (() => {
            let _size = $q.screen.width;

            return _size;
        })
        const screenHeightSize = (() => {
            let _size = $q.screen.height;

            return _size;
        })

        let province = ref(null);
        let currentProvince = ref(null);

        // 이미지 
        const uploadImage = ref(null);
        const image = ref(null);
        const imageUrl = ref('');

        let labels;

        let bgImg = [];

        let rawImg = ref(null);

        let selectedGps = ref(null);
        let selectedGpsoption = imageInfo.selectGpsOption();
        let gpsCard = ref(false);
        let imageFile = null;

        let selectedMap = ref(false);

        // map 초기값
        let centered = null;
        let mapCenter = {
            lat: 35.8,
            lng: 127.689999
        };
        let size = {
            height: screenHeightSize(),
            width: screenWidthSize()//d3.select('.map-wrapper').node().getBoundingClientRect().width,  
        };

        let initialScale = 6500;

        let color = d3.scale.linear()
            .domain([1, 20])
            .clamp(true)
            .range(['#08304b', '#08304b']);
    
        let projection = d3.geo.mercator()
            .scale(initialScale)
            .center([mapCenter.lng, mapCenter.lat])
            .translate([size.width / 2, size.height / 2]);
        // let projection = d3.geo.equirectangular()
        //     .scale(initialScale)
        //     .center([mapCenter.lng, mapCenter.lat])
        //     .translate([size.width / 2, size.height / 2]);

        let path = d3.geo.path()
            .projection(projection);
        
        // let zoom = d3.behavior
        //     .zoom()
        //     .translate(projection.translate())
        //     .scale(projection.scale())
        //     .scaleExtent([size.height, 800 * size.height])
        //     .on('zoom', mapZoom)
        //     ;

        // map svg 
        let svg;
        let g;
        let effectLayer;
        let mapLayer;
        

        const handleImages = ((files) => {
            let arrFile = [...files];

            console.log(arrFile)

            arrFile.map(async ( arr ) => {
                checkImageGps(arr);
            })
        })

        // 이미지 좌료 유무에 따라 분기
        const checkImageGps =  (async (fileObject) => {
            let imgGps = await imageInfo.getImageGps(fileObject);
            let loc = imageInfo.getImageLoc(imgGps.latitute, imgGps.longitude);

            let info;

            if (imgGps.latitute != 0 && typeof loc != 'undefined' ){
                // selectGps();
                info = {
                    latitute : imgGps.latitute,
                    longitude : imgGps.longitude,
                    properties : loc.properties
                };
                
                loc.image = fileObject;
    
                bgImg.push(loc);  
    
                createBase64Image(fileObject, info);

                update();
            } else {
                noneGps( fileObject );
                
            }

        })

        // 이미지 좌표 지정해서 저장
        const saveImageGps = (() => {
            let sggFeature = currentProvince.value ? imageInfo.getSggFeature(currentProvince.value.SIG_CD) : imageInfo.getSggFeature(selectedGps.value);
            let info = {
                latitute : sggFeature.latitute,
                longitude : sggFeature.longitude,
                properties : sggFeature.properties
            };
            
            sggFeature.image = imageFile;

            bgImg.push(sggFeature);  

            createBase64Image(imageFile, info);

            update();

            imageFile = null;
        })

        const createBase64Image = (async (fileObject, info) => {
            // 이미지 base64
            let reader = new FileReader();
            reader.onload = async (e) => {
                rawImg.value = e.target.result;
                // imageInfo.setImage(fileObject.name, rawImg.value);
                // 서버에 이미지 저장
                 await imageInfo.setImage(fileObject, rawImg.value, info);
                // loc.url = remoteUrl.id;                              
            };
            reader.readAsDataURL(fileObject);
            // reader.readAsBinaryString(fileObject);
        })

        // GPS 없는 이미지에 GPS 맵핑
        const noneGps = (( fileObject ) => {
            if ( currentProvince.value ) {
                selectedMap.value = true
            } else {
                
                gpsCard.value = true;
            }
            
            imageFile = fileObject;
        })        

        const selectProvince = (( province ) => {
            province.value = province;
        })

        const openInfo = (( province ) => {
            // console.log('province', province);            
            let sigEngNm = province.SIG_ENG_NM;
            let id = '#img' + sigEngNm.replace(', ', '-') ;
            let inImgUrl = document.querySelector(id).getAttribute('href');
            province.url = inImgUrl;
            currentProvince.value = province
        })

        const closeInfo = (() => {
            currentProvince.value =  '';
        })

        onMounted(()=> {
            rendor();
        })

        const update = (() => {
            // svg.selectAll("pattern").remove();
            // svg = imageInfo.getSvgPattern(koreaMap.features, svg, imageArray);            
            // reader();
        })

        const rendor = ( async () => {

            svg = d3.select('svg')
                .attr('width', size.width)
                .attr('height', size.height);

            svg.append('defs');

            let imageArray = await imageInfo.getImageAll();
            
            svg = imageInfo.getSvgPattern(koreaMap.features, svg, imageArray);

            // svg.call(zoom);
      
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
            let sigEngNm = d.properties.SIG_ENG_NM;
            let id = '#img' + sigEngNm.replace(', ', '-') ;

            let fillId = `url('#` + sigEngNm.replace(', ', '-') + `')`;
            d3.select(this).style('fill', fillId);
            
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

        // const mapZoom = (() => {
        //     projection.translate(d3.event.translate).scale(d3.event.scale);
        // })
        function mapZoom () {
            console.log('zoom');
            projection.translate(d3.event.translate).scale(d3.event.scale);
            mapLayer.selectAll('path').attr('d', path);
        }

        
        return {
            province,
            currentProvince,
            image,
            imageUrl,
            handleImages,
            uploadImage,
            rawImg,
            gpsCard,
            selectedGps,
            selectedGpsoption,
            saveImageGps,
            selectedMap
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
    border-radius: 7px;
    top: 150px;
    right: 20px;
    // height: 400px;
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
  .my-card {
    width: 100%;
    max-width: 290px;
  }
  .gps-card {
    width: 100%;
    min-width: 250px;
    max-width: 290px;
  }
}
</style>