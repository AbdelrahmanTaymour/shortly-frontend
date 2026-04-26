// src/services/ToastService.js
import Toast from '../ui/components/feedback/Toast/Toast.js';

class ToastService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this._initContainer();
        this._setupListeners();
    }

    _initContainer() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    _setupListeners() {
        this.eventBus.on(this.eventBus.EVENTS.NOTIFICATION_SHOW, (data) => {
            console.log("ToastService: Received notification event!", data);
            this.show(data.message, data.type, data.duration);
        });
    }

    show(message, type = 'info', duration = 3000) {
        const wrapper = document.createElement('div');
        this.container.appendChild(wrapper);

        const toast = new Toast(wrapper, {message, type, duration});
        toast.mount();

        // Hook into unmount to remove the HTML wrapper from the DOM
        const originalUnmount = toast.unmount.bind(toast);
        toast.unmount = async () => {
            await originalUnmount();
            wrapper.remove(); // This removes the empty div from the toast-container
        };
    }
}

export default ToastService;