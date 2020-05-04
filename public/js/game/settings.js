$(()=>{
    $("#settings-gamespeed-input input").on('input propertychange', () => {
        let speed = $("#settings-gamespeed-input input")[0].value;
        if(speed != 1 && speed != 2 && speed != 3 && speed != 4) return ;
        $("#settings-gamespeed-input-display")[0].innerHTML = speed;
        s.emit('changeSettings', {speed: speed})
    });
    s.on('UpdateSettings', function(dat){
        $("#settings-gamespeed-input input")[0].value = dat.speed;
        $("#settings-gamespeed-input-display")[0].innerHTML = dat.speed;
    });
})