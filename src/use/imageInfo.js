import ExifReader from 'exifreader';
import pointInPolygon  from 'point-in-polygon';

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

// svg 이미지 패턴
const getSvgPattern = (( features , svg ) => {
    for(let i = 0; i < features.length; i++) {        
        svg.append('pattern')
            .attr('id', features[i].properties.SIG_ENG_NM)
            .attr('x','0')
            .attr('y','0')
            .attr('width', '1')
            .attr('height', '1')
            .append("image")
            .attr('id', 'img' + features[i].properties.SIG_ENG_NM)
            .attr("xlink:href", "/sample.jpg")
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("width", "100")
            .attr("height", "100") ;
    }

    return svg;
});

const imageInfo = {
    getImageLocation,
    getImageGps,
    getSvgPattern,
};

export default imageInfo;