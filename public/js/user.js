setTimeout(() => {
    var template = ``;
    var page = 0;
    $.ajax({
        type: "post",
        url: "/api/template",
        data: {},
        dataType: "json",
        success: function (res) {
            if (res.status == "success") {
                template = res.msg;
                getSourcePost();
            } else {
                toast('error', '模板获取失败', res.msg);
            }
        }
    });
    function getSourcePost() {
        $.ajax({
            type: "post",
            url: "/api/user/post",
            data: { uid: $(".userinfo").attr('uid'), page: ++page },
            dataType: "json",
            success: function (res) {
                if (res.status == "success") {
                    toast('success', '获取成功', '渲染中');
                    if (res.dat.length < 10) {
                        $("#getMore")[0].innerHTML = "好像来到了世界的尽头";
                        $("#getMore").attr('disable', true);
                    }
                    res.dat.forEach(art => {
                        art.created = new Date(art.created);
                        art.modified = new Date(art.modified);
                        $("#userpost").append(ejs.render(template, { art: art }));
                    });
                } else {
                    toast('error', '获取失败', res.msg);
                }
            }
        });
    }
    $("#getMore").click(() => {
        if ($("#getMore").attr('disable')) return;
        getSourcePost();
    })
}, 10);

$(() => {
    function initFileInput() {
        $("#avatar").fileinput({
            language: 'zh',
            dropZoneTitle: '上传头像,可以将图片拖放到这里,最大5Mb,最小尺寸50*50',
            uploadUrl: "/api/upload/avatar",
            autoOrientImage: false,
            allowedFileExtensions: ['jpg', 'png'],
            uploadAsync: true,
            showUpload: true,
            showRemove: true,
            showPreview: true,
            showCancel: true,
            showCaption: true,
            browseClass: "btn btn-primary",
            dropZoneEnabled: true,
            minImageWidth: 50,
            minImageHeight: 50,
            maxImageWidth: 5000,
            maxImageHeight: 5000,
            maxFileSize: 5120,
            minFileCount: 1,
            maxFileCount: 1, 
            previewFileIcon: "<i class='fa fa-file'></i>",
            theme: 'fa',
        })
        $("#banner").fileinput({
            language: 'zh',
            dropZoneTitle: '上传横幅,可以将图片拖放到这里,最大5Mb,最小尺寸700*120',
            uploadUrl: "/api/upload/banner",
            autoOrientImage: false,
            allowedFileExtensions: ['jpg', 'png'],
            uploadAsync: true,
            showUpload: true,
            showRemove: true,
            showPreview: true,
            showCancel: true,
            showCaption: true,
            browseClass: "btn btn-primary",
            dropZoneEnabled: true,
            minImageWidth: 752,
            minImageHeight: 188,
            // maxImageWidth: 1000,
            // maxImageHeight: 1000,
            maxFileSize: 5120,
            minFileCount: 1,
            maxFileCount: 1, 
            previewFileIcon: "<i class='fa fa-file'></i>",
            theme: 'fa',
        })
    }
    initFileInput();
    $('.userinfo-edit').click(function(){
        if($(this).attr('edit') == "true"){
            $(this).attr('edit', false);
            $('.userpost-container').removeClass('kana-hidden');
            $('.useredit').addClass('kana-hidden');
            $(this)[0].innerHTML = "编辑";
        } else{
            $(this).attr('edit', true);
            $('.userpost-container').addClass('kana-hidden');
            $('.useredit').removeClass('kana-hidden');
            $(this)[0].innerHTML = "取消";
        }
    })
})