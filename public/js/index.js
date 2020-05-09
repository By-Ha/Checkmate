$(() => {
    KaTeXReRender();
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
                $('#container').append($result.fadeIn(1000));
                KaTeXReRender();
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