$(function () {
    $("#submitButton").click(function () {
        $("#submitButton").attr('disabled', true);
        $("#submitButton").addClass('iconfont icon-jiazai');
        if ($("form [name=pwd2]")[0].value != $("form [name=pwd]")[0].value) {
            toast('error', '注册失败', '两次输入的密码不一致');
            $("#submitButton").attr('disabled', false);
            $("#submitButton").removeClass('iconfont icon-jiazai');
            return;
        } else if ($("form [name=pwd]")[0].value.length < 8) {
            toast('error', '注册失败', '密码不能小于八位');
            $("#submitButton").attr('disabled', false);
            $("#submitButton").removeClass('iconfont icon-jiazai');
            return;
        } else if ($("form [name=username]")[0].value.length < 3 || $("form [name=username]")[0].value.indexOf('<') != -1) {
            toast('error', '注册失败', '用户名不能小于3位且不能包含"<"号');
            $("#submitButton").attr('disabled', false);
            $("#submitButton").removeClass('iconfont icon-jiazai');
            return;
        }
        $.ajax({
            type: "post",
            url: "/register",
            data: $("#registerForm").serialize(),
            dataType: "json",
            success: function (res) {
                if (res.status == 'success') {
                    $.toast({
                        heading: '注册成功',
                        text: '欢迎',
                        icon: 'success',
                        showHideTransition: 'slide',
                        hideAfter: 1000,
                        position: 'bottom-right',
                        afterHidden: function () { window.location.href = '/'; }
                    });
                }
                else {
                    toast('error', '注册失败', res.msg);
                    $("#submitButton").attr('disabled', false);
                    $("#submitButton").removeClass('iconfont icon-jiazai');
                }
            }
        });
    });
    $("#registerForm").keydown(function (e) {
        if ($("#submitButton").attr('disabled') == 'disabled') return;
        var e = e || event,
            keycode = e.which || e.keyCode;
        if (keycode == 13) {
            $("#submitButton").trigger("click");
        }
    });
})