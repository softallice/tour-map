import ExifReader from 'exifreader';
import pointInPolygon  from 'point-in-polygon';
import Localbase from 'localbase'
import { v4 as uuidv4 } from 'uuid';
import koreaMap from 'src/use/korea-sgg.json'

import axios from 'axios';
import FormData from 'form-data';


// DB 커넥션
let db = new Localbase('db')

// 사진 이미지에 담긴 GPS 정보를 가져옴
const getImageGps = ( async ( imageUrl ) => {
    
    const tags = await ExifReader.load(imageUrl);

    const latitute = tags['GPSLatitude'].description;
    const longitude = tags['GPSLongitude'].description;

    const gpsLocation = {
        'latitute' : latitute,
        'longitude' : longitude
    };

    return gpsLocation;
});

// GPS 정보로 시군 위치 찾기
// geoJSON, latitute, longitude
// const getImageLocation = (( features, lat, lon )=>{
const getImageLocation = (( features, lat, lon )=>{
    for(let i = 0; i < features.length; i++) {
        var polygon = features[i].geometry.coordinates[0];
        var lat1 = 37.4046341 ; //37.4944698 ; 7.43861
        var lon1 = 127.8842384 ;//126.37861 ; //126.9218479;
        
        if (pointInPolygon([ lon , lat ], polygon)) {
            // console.log(features[i].properties.SIG_ENG_NM)
          return features[i];
        }
    }
});

// 이미지 개별 gps 정보로 위치(가져오기)
const getImageLoc = (( lat, lon )=>{
    let geoFeatures = koreaMap.features;
    for(let i = 0; i < geoFeatures.length; i++) {
        var polygon = geoFeatures[i].geometry.coordinates[0];
        var lat1 = 37.45392 ; //37.4944698 ; 7.43861
        var lon1 = 126.38244 ;
        if (pointInPolygon([ lon , lat ], polygon)) {
            // console.log(features[i].properties.SIG_ENG_NM)
          return geoFeatures[i];
        }
    }
});

// svg 이미지 패턴- 패턴에 이미지 넣기
const getSvgPattern = ( ( features , svg , imgArry ) => {

    for(let i = 0; i < features.length; i++) {        
        let sigEngNm = features[i].properties.SIG_ENG_NM;

        let imageUrl = imgArry.filter(image => image.info.properties.SIG_ENG_NM === sigEngNm)[0]

        // console.log('imageUrl', imageUrl.image);
        

        if(typeof imageUrl == "undefined" || imageUrl == null || imageUrl == "") {
            imageUrl = ""; ///sample.jpg
        } else {
            imageUrl =  imageUrl.image;
        }

        svg.append('pattern')
            .attr('id', sigEngNm.replace(', ', '-'))
            .attr('x','0')
            .attr('y','0')
            .attr('width', '1')
            .attr('height', '1')
            .append("image")
            .attr('id', 'img' + sigEngNm.replace(', ', '-'))
            .attr("xlink:href", imageUrl)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("width", "100")
            .attr("height", "100") ;
    }

    return svg;
});

// 이미지 서버 전송
const setDbImage = ( async ( file , image, info ) => {
    // var FormData = require('form-data');
    // console.log('loc', loc);
    var data = new FormData();
    data.append('uri', image);

    var config = {
        method: 'post',
        url: 'http://172.27.42.125:3030/uploads',
        headers: { 
            'Content-Type': "multipart/form-data"
        },
        data : data
      };

    let res;

    try {
        res = await axios(config) ;
        
        await setDbImageUrl(file.name, res.data.id, info);

    } catch (e) {
        console.log(e)
    }

    return res.data;
})

// 이미지 URL 정보 저장
const setDbImageUrl = ( async (name, url , info) => {

    console.log('info', info)
    
    let data = {
        name : name,
        url : url,
        info : info
    };

    var config = {
        method: 'post',
        url: 'http://172.27.42.125:3030/image-map',
        headers: { 
          'Content-Type': 'application/json'
        },
        data : data
    };
    try {
        let res = await axios(config) ;
    } catch (e) {
        console.log("image url post fail")
    }

})

// 서버에서 이미지 정보 가져오기
const getDbImage = ( async () => {
    var data = '';

    var config = {
    method: 'get',
    url: 'http://172.27.42.125:3030/image-map',
    headers: { },
    data : data
    };

    let response = await axios(config);

    // console.log('response', response);

    return response.data.data
})


// 로컬 indexedDB에 저장
const setImage = ( async ( file , image, info ) => {
    
    let data = {
        id : file.name,
        image : image,
        info : info
    };
    
    await db.collection('images').add(data) ;

})


// 로컬 이미지 가져오기
const getImage = ( async ( name ) => {
    let response
    try {
        response = await db.collection('images').doc({ name: name }).get()
    } catch(e) {
        console.log('error', e);
    }
    
    return response;
})

const getImageAll = (async ( ) => {
    let response = await db.collection('images').get()

    return response;
})

const imageInfo = {
    getImageLocation,
    getImageLoc,
    getImageGps,
    getSvgPattern,
    setImage,
    getImage,
    getImageAll,
    setDbImage,
    getDbImage
};

export default imageInfo;