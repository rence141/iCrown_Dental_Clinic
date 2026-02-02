const { useState, useEffect } = React;

const BookingCalendarComponent = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  const services = [
    { id: 'cleaning', name: 'Dental Cleaning', duration: '45 mins', price: '₱1,500' },
    { id: 'checkup', name: 'Routine Checkup', duration: '30 mins', price: '₱800' },
    { id: 'whitening', name: 'Teeth Whitening', duration: '60 mins', price: '₱5,000' },
    { id: 'filling', name: 'Tooth Filling', duration: '45 mins', price: '₱2,000' },
    { id: 'extraction', name: 'Tooth Extraction', duration: '30 mins', price: '₱1,200' },
    { id: 'braces', name: 'Braces Consultation', duration: '60 mins', price: '₱2,500' }
  ];

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
  ];

  // Generate calendar days
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date) => {
    const today = new Date();
    return date && 
           date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date && date < today;
  };

  const isWeekend = (date) => {
    return date && (date.getDay() === 0 || date.getDay() === 6);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (date) => {
    if (date && !isPastDate(date) && !isWeekend(date)) {
      setSelectedDate(date);
      // Generate available slots for selected date
      const slots = timeSlots.filter(() => Math.random() > 0.3); // Randomly make some slots unavailable
      setAvailableSlots(slots);
      setSelectedTime('');
    }
  };

  const handleBooking = () => {
    if (selectedDate && selectedTime && selectedService) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmBooking = () => {
    // Here you would normally send the booking to your backend
    alert(`Appointment booked successfully!\n\nService: ${services.find(s => s.id === selectedService)?.name}\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${selectedTime}\n\nWe'll send you a confirmation email shortly.`);
    
    // Reset form
    setSelectedDate(null);
    setSelectedTime('');
    setSelectedService('');
    setShowConfirmation(false);
    setAvailableSlots([]);
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return React.createElement('div', { className: 'booking-calendar-container' },
    // Header
    React.createElement('div', { className: 'booking-header' },
      React.createElement('h2', null, 'Book Your Appointment'),
      React.createElement('p', { className: 'text-muted' }, 'Select your preferred date, time, and service')
    ),

    // Calendar Section
    React.createElement('div', { className: 'calendar-section' },
      // Month Navigation
      React.createElement('div', { className: 'calendar-nav' },
        React.createElement('button', { 
          className: 'btn-nav',
          onClick: handlePreviousMonth 
        }, React.createElement('i', { className: 'bi bi-chevron-left' })),
        React.createElement('h3', { className: 'calendar-month' }, formatMonthYear(currentDate)),
        React.createElement('button', { 
          className: 'btn-nav',
          onClick: handleNextMonth 
        }, React.createElement('i', { className: 'bi bi-chevron-right' }))
      ),

      // Calendar Grid
      React.createElement('div', { className: 'calendar-grid' },
        // Week day headers
        weekDays.map(day => 
          React.createElement('div', { key: day, className: 'calendar-header-day' }, day)
        ),
        
        // Calendar days
        days.map((day, index) => 
          React.createElement('button', {
            key: index,
            className: `calendar-day ${
              !day ? 'empty' : 
              selectedDate?.getTime() === day?.getTime() ? 'selected' :
              isToday(day) ? 'today' : 
              isPastDate(day) ? 'past' : 
              isWeekend(day) ? 'weekend' : 'available'
            }`,
            onClick: () => handleDateSelect(day),
            disabled: !day || isPastDate(day) || isWeekend(day)
          },
            day && React.createElement('span', null, day.getDate())
          )
        )
      )
    ),

    // Booking Details Section
    React.createElement('div', { className: 'booking-details' },
      // Service Selection
      React.createElement('div', { className: 'booking-section' },
        React.createElement('h4', null, 'Select Service'),
        React.createElement('div', { className: 'service-grid' },
          services.map(service => 
            React.createElement('button', {
              key: service.id,
              className: `service-card ${selectedService === service.id ? 'selected' : ''}`,
              onClick: () => setSelectedService(service.id)
            },
              React.createElement('div', { className: 'service-name' }, service.name),
              React.createElement('div', { className: 'service-details' },
                React.createElement('span', { className: 'duration' }, service.duration),
                React.createElement('span', { className: 'price' }, service.price)
              )
            )
          )
        )
      ),

      // Time Selection (only show when date is selected)
      selectedDate && React.createElement('div', { className: 'booking-section' },
        React.createElement('h4', null, `Available Times for ${selectedDate.toLocaleDateString()}`),
        React.createElement('div', { className: 'time-slots-grid' },
          timeSlots.map(time => 
            React.createElement('button', {
              key: time,
              className: `time-slot ${selectedTime === time ? 'selected' : ''} ${!availableSlots.includes(time) ? 'unavailable' : ''}`,
              onClick: () => availableSlots.includes(time) && setSelectedTime(time),
              disabled: !availableSlots.includes(time)
            },
              time,
              !availableSlots.includes(time) && React.createElement('span', { className: 'unavailable-label' }, 'Booked')
            )
          )
        )
      ),

      // Book Button
      selectedDate && selectedTime && selectedService && React.createElement('div', { className: 'booking-section' },
        React.createElement('button', { 
          className: 'btn-book-appointment',
          onClick: handleBooking 
        }, 'Book Appointment')
      )
    ),

    // Confirmation Modal
    showConfirmation && React.createElement('div', { className: 'booking-modal-overlay' },
      React.createElement('div', { className: 'booking-modal' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h3', null, 'Confirm Appointment'),
          React.createElement('button', { 
            className: 'btn-close',
            onClick: () => setShowConfirmation(false) 
          }, React.createElement('i', { className: 'bi bi-x-lg' }))
        ),
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { className: 'confirmation-details' },
            React.createElement('div', { className: 'detail-row' },
              React.createElement('label', null, 'Service:'),
              React.createElement('span', null, services.find(s => s.id === selectedService)?.name)
            ),
            React.createElement('div', { className: 'detail-row' },
              React.createElement('label', null, 'Date:'),
              React.createElement('span', null, selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }))
            ),
            React.createElement('div', { className: 'detail-row' },
              React.createElement('label', null, 'Time:'),
              React.createElement('span', null, selectedTime)
            ),
            React.createElement('div', { className: 'detail-row' },
              React.createElement('label', null, 'Duration:'),
              React.createElement('span', null, services.find(s => s.id === selectedService)?.duration)
            ),
            React.createElement('div', { className: 'detail-row total' },
              React.createElement('label', null, 'Estimated Cost:'),
              React.createElement('span', null, services.find(s => s.id === selectedService)?.price)
            )
          )
        ),
        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', { 
            className: 'btn-cancel',
            onClick: () => setShowConfirmation(false) 
          }, 'Cancel'),
          React.createElement('button', { 
            className: 'btn-confirm',
            onClick: handleConfirmBooking 
          }, 'Confirm Booking')
        )
      )
    )
  );
};

// Make component globally available
window.BookingCalendarComponent = BookingCalendarComponent;

// Debug: Log that component is loaded
console.log('BookingCalendar component loaded successfully');
