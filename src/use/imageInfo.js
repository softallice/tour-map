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

// svg 이미지 패턴
const getSvgPattern = (( features , svg ) => {
    for(let i = 0; i < features.length; i++) {        
        let sigEngNm = features[i].properties.SIG_ENG_NM;

        svg.append('pattern')
            .attr('id', sigEngNm.replace(', ', '-'))
            .attr('x','0')
            .attr('y','0')
            .attr('width', '1')
            .attr('height', '1')
            .append("image")
            .attr('id', 'img' + sigEngNm.replace(', ', '-'))
            .attr("xlink:href", "/sample.jpg")
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("width", "100")
            .attr("height", "100") ;
    }

    return svg;
});

const setDbImage = ( async ( name , image ) => {
    // var FormData = require('form-data');
    var data = new FormData();
    data.append('uri', image);

    var config = {
        method: 'post',
        url: 'http://localhost:3030/uploads',
        headers: { 
            'Content-Type': "multipart/form-data"
        },
        data : data
      };

    let res;

    try {
        res = await axios(config) ;

        await setDbImageUrl(name, res.data.id);

    } catch (e) {
        console.log("image upload post fail")
    }

    return res.data;
})

const setDbImageUrl = ( async (name, url ) => {
    
    let data = {
        name : name,
        url : url
    };

    var config = {
        method: 'post',
        url: 'http://localhost:3030/image-map',
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



const setImage = ( async ( name , image ) => {
    let id = uuidv4();
    console.log(' set image', name);
    let data = {
        id : id,
        name : name,
        image : image,
    };
    
    db.collection('images').add(data) ;

    // TODO : 나중에 
    // let checkImage = await getImage(name);

    
    // if (checkImage.name === name ) {
    //     console.log('중복 저장 제거')
    //     return ;
    // }
    // else {
    //     db.collection('images').add(data) ;
    // }
    
})

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
    setDbImage
};

export default imageInfo;