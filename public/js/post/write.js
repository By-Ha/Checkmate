$(function () {
    $("#write-submit").click(function () {
        $("#write-submit").attr('disabled', true);
        $("#write-submit").addClass('iconfont icon-jiazai');
        if(!isNaN(Number($("#writepost").attr('pid')))) {
            updatePost();
            return;
        }
        var content = $("#writepost")[0].innerHTML;
        content = content.replace(/<div>/g,'\n');
        content = content.replace(/<\/div>/g,'');
        content = content.replace(/<br>/g,'\n');
        $.ajax({
            type: "post",
            url: "/api/post",
            data: {content: content, type: 0},
            dataType: "json",
            success: function (res) {
                if(res.status == 'success') {
                    $.toast({
                        heading: '发送成功',
                        text: '希望能被更多人看到吧!',
                        icon: 'success',
                        showHideTransition: 'slide',
                        hideAfter: 1000,
                        position: 'bottom-right',
                        afterHidden: function () {window.location.href = '/';}
                    });   
                }
                else {
                    toast('error', '发送失败', res.msg);
                    $("#write-submit").attr('disabled', false);
                    $("#write-submit").removeClass('iconfont icon-jiazai');
                }
            }
        });
    });

    function updatePost(){
        var content = $("#writepost")[0].innerHTML;
        content = content.replace(/<div>/g,'\n');
        content = content.replace(/<\/div>/g,'');
        content = content.replace(/<br>/g,'\n');
        $.ajax({
            type: "post",
            url: "/api/updatepost",
            data: {content: content, pid: Number($("#writepost").attr('pid'))},
            dataType: "json",
            success: function (res) {
                if(res.status == 'success') {
                    $.toast({
                        heading: '修改成功',
                        text: '希望能被更多人看到吧!',
                        icon: 'success',
                        showHideTransition: 'slide',
                        hideAfter: 1000,
                        position: 'bottom-right',
                        afterHidden: function () {window.location.href = window.location.origin;}
                    });   
                }
                else {
                    toast('error', '修改失败', JSON.stringify(res.msg));
                    $("#write-submit").attr('disabled', false);
                    $("#write-submit").removeClass('iconfont icon-jiazai');
                }
            }
        });
    }
})