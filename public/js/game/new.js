var app = new Vue({
  el: "#main",
  data: {
    s: undefined,
    coverShow: true,
    ready: false,
    settings: {
      public: false,
      speed: 4,
      map: new Array(100).fill(0)
    },
    style: {
      size: 30
    },
    game: {
      movement: [],
      select: [1, 1],
      round: 0,
      start: false,
      patch_tmp: [],
      User: [],
      colorNick: [],
      myColor: -1,
      totalUser: 0,
      readyUser: 0,
      size: 10,
      halfTag: false,
      gm: new Array(11).fill(new Array(11).fill({ color: 1, amount: 0 }))
    }
  },
  computed: {
    readyUserInfo: function () {
      return this.game.readyUser + '/' + this.game.totalUser;
    }
  },
  methods: {
    sliderInfo(val) {
      return '速度' + val + 'x';
    },
    readyChange() {
      this.ready = !this.ready;
      this.voteStart();
    },
    uploadSettings(map) {
      let settings = {};
      settings.private = !this.settings.public;
      if (map) settings.map = map;
      settings.speed = this.settings.speed
      this.s.emit('changeSettings', settings);
    },
    voteStart() {
      this.s.emit('VoteStart', this.ready ? 1 : 0);
    },
    patch(dat) {
      let gm = this.game.gm
      coverShow = false;
      for (let i = 0; i < dat.length; ++i) {
        let e = dat[i];
        if (gm[e[0]] == undefined) {
          this.game.gm.splice(e[0], 1, []);
        }
        this.game.gm[e[0]].splice(e[1], 1, JSON.parse(e[2]));
      }
    },
    Map_Update(rnd) {
      // console.log(rnd, this.game.gm[1][1].amount)
      let gm = this.game.gm;
      let patch_tmp = this.game.patch_tmp;
      if (patch_tmp[rnd]) {

        if (gm[0][0].type == 1) { // 普通模式
          let upd_road = (rnd % 10 == 0);
          for (let i = 1; i <= this.game.size; ++i) {
            for (let j = 1; j <= this.game.size; ++j) {
              if (upd_road && gm[i][j].type == 2 && gm[i][j].color != 0) gm[i][j].amount++;
              if (gm[i][j].type == 1 || gm[i][j].type == 3) gm[i][j].amount++;
            }
          }
        } else if (gm[0][0].type == 2) { // 吃鸡模式
          //目前全部由服务器处理
        }

        this.patch(patch_tmp[rnd]);
        ++this.game.round;
        this.Map_Update(rnd + 1);
      }
    },
    judgeShown(x, y) {
      for (let i = -1; i <= 1; ++i) {
        for (let j = -1; j <= 1; ++j) {
          let tx = x + i, ty = y + j;
          if (this.coverShow || tx <= 0 || ty <= 0 || tx > this.game.size || ty > this.game.size) continue;
          if (this.game.gm[tx][ty].color == this.game.myColor) return true;
        }
      }
      return false;
    },
    getAmount(i, j) {
      if (this.game.gm == undefined || this.game.gm[i] == undefined || this.game.gm[i][j] == undefined) return 0;
      if (!this.judgeShown(i, j)) return '';
      if (this.game.gm[i][j].amount == 0) return '';
      else return this.game.gm[i][j].amount;
    },
    getColor(i, j) {
      const color = ['grey', 'blue', 'red', 'green', 'orange', 'pink', 'purple', 'chocolate', 'maroon'];
      if (this.game.gm == undefined || this.game.gm[i] == undefined || this.game.gm[i][j] == undefined) return 'grey';
      if (!this.judgeShown(i, j)) return 'unshown';
      let ret = color[this.game.gm[i][j].color];
      if(this.game.myColor == this.game.gm[i][j].color) ret += ' own';
      if(Math.abs(this.game.select[0] - i) + Math.abs(this.game.select[1] - j) == 1) ret += ' select';
      return ret;
    },
    getType(i, j) {
      const tp = [null, 'crown', null, 'city', 'mountain', 'empty-city', 'obstacle', 'heart', 'sword', 'gas', 'kit', 'armor', 'wifi'];
      if (this.game.gm == undefined || this.game.gm[i] == undefined || this.game.gm[i][j] == undefined) return 'grey';
      if (!this.judgeShown(i, j)) return (this.game.gm[i][j].type == 3 || this.game.gm[i][j].type == 4 || this.game.gm[i][j].type == 5) ? tp[6] : '';
      if (tp[this.game.gm[i][j].type] == null) return '';
      else return tp[this.game.gm[i][j].type];
    },
    select(i, j) {
      this.game.select = [i, j];
    },
    addMovement(x, y) {
      var t1 = this.game.select[0] + x, t2 = this.game.select[1] + y;
      if (t1 > this.game.size || t1 <= 0 || t2 > this.game.size || t2 <= 0) return;
      if (this.game.gm[t1][t2] == undefined || this.game.gm[t1][t2].type == 4) return;
      if (!this.game.halfTag) this.s.emit('UploadMovement', [this.game.select[0], this.game.select[1], t1, t2, 0]);
      else this.s.emit('UploadMovement', [this.game.select[0], this.game.select[1], t1, t2, 1]);
      this.select(t1, t2);
    },
    clearMomement() {
      s.emit('ClearMovement', null);
    }
  },
  mounted: function () {
    let that = this
    this.s = io.connect('http://' + window.location.hostname + ':444/', {
      path: '/ws/checkmate'
    });
    s = this.s;
    s.on('connect', function () {
      s.emit('joinRoom', room);
    });
    s.on('closeTab', function () {
      window.location.href = '/';
    });
    s.on('UpdateSettings', function (dat) {
      that.settings.speed = Number(dat.speed);
      that.settings.public = !dat.private;
      that.settings.map = dat.map;
    });
    s.on('LoggedUserCount', function (dat) {
      that.game.totalUser = dat[0];
      that.game.readyUser = dat[1];
    });
    s.on('disconnect', function () {
      that.$notify.error({
        title: '错误',
        message: '失去同步'
      });
    });
    s.on('UpdateGM', function (dat) {
      that.game.gm = dat;
      that.game.size = dat[0][0].size;
      coverShow = false;
      that.game.start = true;
    });
    s.on('UpdateUser', function (dat) {
      that.game.User = dat;
      that.game.colorNick = [];
      for (var k in that.game.User) {
        that.game.colorNick[that.game.User[k].color] = that.game.User[k].uname;
      }
    });
    s.on('UpdateColor', function (dat) {
      that.game.myColor = dat;
    });
    s.on('UpdateSize', function (dat) {
      that.game.size = dat;
    });
    s.on('Update_Round', (dat) => { that.game.round = dat; });
    s.on('GameStart', function () {
      if (that.game.myColor != 0 && that.game.myColor != -1) {
        that.game.start = true;
        that.ready = false;
        that.coverShow = false;
      }
      round = 0; movement = [];
    });
    s.on('Map_Update', (dat) => {
      if (dat[0] >= 2 && that.game.start == false) {
        that.s.emit('Ask_GM');
      }
      that.game.patch_tmp[dat[0]] = dat[1];
      if (dat[0] == that.game.round + 1) {
        that.Map_Update(that.game.round + 1);
      }
    });
    s.on('WinAnction', function (dat) {
      that.game.start = false;
      that.game.myColor = -1;
      that.game.gm = [];
      that.game.movement = [];
      that.game.patch_tmp = [];
      that.$notify({
        title: '欢呼',
        message: dat + "赢了",
        type: 'success'
      });
      that.coverShow = true;
      that.ready = false;
    });
    s.on('die', function () {
      that.$notify.error({
        title: '芜湖!',
        message: '您死了!'
      });
      setTimeout(() => {
        that.game.start = false;
        that.s.emit('Ask_GM');
      }, 500);
    });
    s.on('WorldMessage', (msg) => {//
      this.$notify.info({
        title: '消息',
        message: msg
      });
    });
    document.onkeydown = function (event) {
      var e = event || window.event || arguments.callee.caller.arguments[0];
      if (!e) return;
      if (e.keyCode == 87) { // W
        that.addMovement(-1, 0);
        that.game.halfTag = false;
      } else if (e.keyCode == 65) { // A
        that.addMovement(0, -1);
        that.game.halfTag = false;
      } else if (e.keyCode == 83) { // S
        that.addMovement(1, 0);
        that.game.halfTag = false;
      } else if (e.keyCode == 68) { // D
        that.addMovement(0, 1);
        that.game.halfTag = false;
      } else if (e.keyCode == 81) { // Q
        that.clearMomement();
      } else if (e.keyCode == 90) { // Z
        that.game.halfTag = !that.game.halfTag;
      }
    };
  }
})