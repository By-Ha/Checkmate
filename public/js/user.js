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
            maxFileSize: 5120,
            minFileCount: 1,
            maxFileCount: 1,
            previewFileIcon: "<i class='fa fa-file'></i>",
            theme: 'fa',
        })
    }
    initFileInput();
    $('.userinfo-edit').click(function () {
        if ($(this).attr('edit') == "true") {
            $(this).attr('edit', false);
            $('.userpost-container').removeClass('kana-hidden');
            $('.useredit').addClass('kana-hidden');
            $(this)[0].innerHTML = "编辑";
        } else {
            $(this).attr('edit', true);
            $('.userpost-container').addClass('kana-hidden');
            $('.useredit').removeClass('kana-hidden');
            $(this)[0].innerHTML = "取消";
        }
    })
})
$(() => {
    function addAtUsername() {
        $("article object .user.at.unfinish").each(function (e) {
            $.get('/api/user/info', { uid: this.getAttribute("uid") }, (dat) => {
                this.innerHTML = "@" + dat.msg.username;
                this.classList.remove("unfinish");
            })
        })
    }
    KaTeXReRender();
    addAtUsername();
    $("#getMore a").click(function (e) {
        e.preventDefault();
        $("#getMore a").hide();
        $.ajax({
            url: $(this).attr('href'),
            type: "get",
            error: function (request) {
                alert('加载错误!请联系网站管理员！');
            },
            success: function (data) {
                var $result = $(data).find("#container article");
                $('#userpost').append($result.fadeIn(1000));
                KaTeXReRender();
                addAtUsername();
                if ($(data).find("#getMore a").attr('href') != undefined && $(data).find("#getMore a").attr('href') != "") {
                    $("#getMore a").show();
                    $("#getMore a").text('(｡・`ω´･)点我查看更多！');
                    $("#getMore a").attr('href', $(data).find("#getMore a").attr('href'));
                } else {
                    $("#getMore a").remove();
                    $("#getMore").html('<p>你已到达了世界的尽头(｡・`ω´･)！</p>');
                }
            }
        });
    })
})