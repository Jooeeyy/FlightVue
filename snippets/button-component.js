Vue.component('my-button', {
    data: function() {
        return {
            counter: 0
        }
    },
    methods: {
        click: function() {
            this.counter++;
        }
    },
    template: '<button @click="click()" type="button" class="actionbutton">Counter Button - {{counter}}</button>',
});
